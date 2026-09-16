import { Router, type IRouter } from "express";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { caseFileMessages, caseFiles } from "@workspace/db/schema";
import {
  CreateCaseFileBody,
  DeleteCaseFileParams,
  GetCaseFileParams,
  ListCaseFileMessagesParams,
  SendCaseFileMessageBody,
  SendCaseFileMessageParams,
  UpdateCaseFileBody,
  UpdateCaseFileParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type CaseFileRow = typeof caseFiles.$inferSelect;

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toDatabaseDate(value: Date | null | undefined) {
  if (value === undefined) return undefined;
  return value ? value.toISOString().slice(0, 10) : null;
}

async function messageCount(caseFileId: number) {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(caseFileMessages)
    .where(eq(caseFileMessages.caseFileId, caseFileId));
  return Number(result?.count ?? 0);
}

async function serializeCaseFile(row: CaseFileRow) {
  return {
    id: row.id,
    title: row.title,
    clientName: row.clientName,
    matterType: row.matterType,
    jurisdiction: row.jurisdiction,
    status: row.status as "active" | "review" | "completed",
    progress: row.progress,
    summary: row.summary,
    issues: row.issues,
    keyFacts: row.keyFacts,
    nextSteps: row.nextSteps,
    nextDeadline: row.nextDeadline,
    messagesCount: await messageCount(row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/case-files", async (req, res) => {
  const rows = await db
    .select()
    .from(caseFiles)
    .orderBy(desc(caseFiles.updatedAt));
  res.json(await Promise.all(rows.map(serializeCaseFile)));
});

router.post("/case-files", async (req, res) => {
  const body = CreateCaseFileBody.parse(req.body);
  const [created] = await db
    .insert(caseFiles)
    .values({
      title: body.title,
      matterType: body.matterType,
      clientName: body.clientName ?? null,
      jurisdiction: body.jurisdiction,
      summary: "Start by telling CaseCraft what happened, in your own words.",
      nextSteps: ["Describe the core events and upload or reference your notes."],
    })
    .returning();
  res.status(201).json(await serializeCaseFile(created));
});

router.get("/case-files/summary", async (_req, res) => {
  const rows = await db.select().from(caseFiles).orderBy(desc(caseFiles.updatedAt));
  const recentRows = rows.slice(0, 4);
  res.json({
    total: rows.length,
    active: rows.filter((row) => row.status === "active").length,
    review: rows.filter((row) => row.status === "review").length,
    completed: rows.filter((row) => row.status === "completed").length,
    recentActivity: recentRows.map((row) => ({
      id: row.id,
      title: row.title,
      activity:
        row.progress === 0
          ? "New case file created"
          : `${row.progress}% organized`,
      updatedAt: row.updatedAt,
    })),
  });
});

router.get("/case-files/:id", async (req, res) => {
  const { id } = GetCaseFileParams.parse(req.params);
  const [row] = await db.select().from(caseFiles).where(eq(caseFiles.id, id));
  if (!row) return res.status(404).json({ error: "Case file not found" });
  return res.json(await serializeCaseFile(row));
});

router.patch("/case-files/:id", async (req, res) => {
  const { id } = UpdateCaseFileParams.parse(req.params);
  const body = UpdateCaseFileBody.parse(req.body);
  const [updated] = await db
    .update(caseFiles)
    .set({
      ...body,
      nextDeadline: toDatabaseDate(body.nextDeadline),
      updatedAt: new Date(),
    })
    .where(eq(caseFiles.id, id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Case file not found" });
  return res.json(await serializeCaseFile(updated));
});

router.delete("/case-files/:id", async (req, res) => {
  const { id } = DeleteCaseFileParams.parse(req.params);
  const [deleted] = await db
    .delete(caseFiles)
    .where(eq(caseFiles.id, id))
    .returning({ id: caseFiles.id });
  if (!deleted) return res.status(404).json({ error: "Case file not found" });
  return res.status(204).send();
});

router.get("/case-files/:id/messages", async (req, res) => {
  const { id } = ListCaseFileMessagesParams.parse(req.params);
  const rows = await db
    .select()
    .from(caseFileMessages)
    .where(eq(caseFileMessages.caseFileId, id))
    .orderBy(asc(caseFileMessages.createdAt));
  res.json(rows);
});

router.post("/case-files/:id/messages", async (req, res) => {
  const { id } = SendCaseFileMessageParams.parse(req.params);
  const { content } = SendCaseFileMessageBody.parse(req.body);
  const [caseFile] = await db.select().from(caseFiles).where(eq(caseFiles.id, id));
  if (!caseFile) return res.status(404).json({ error: "Case file not found" });

  await db.insert(caseFileMessages).values({
    caseFileId: id,
    role: "user",
    content,
  });
  await db
    .update(caseFiles)
    .set({ updatedAt: new Date(), progress: Math.max(caseFile.progress, 24) })
    .where(eq(caseFiles.id, id));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    send({
      error:
        "AI is not connected yet. Add an OpenAI API key in Secrets to activate the case-file assistant.",
      configured: false,
      done: true,
    });
    return res.end();
  }

  const previousMessages = await db
    .select()
    .from(caseFileMessages)
    .where(eq(caseFileMessages.caseFileId, id))
    .orderBy(asc(caseFileMessages.createdAt));

  const openAiMessages = [
    {
      role: "system",
      content:
        "You are CaseCraft, an educational legal case-file assistant for law students. Help organize facts, identify issues, clarify timelines, and suggest research next steps. Do not give definitive legal advice, invent authorities, or imply attorney-client privilege. Ask focused follow-up questions when facts are missing. Keep responses structured and practical. Current case file context: " +
        JSON.stringify({
          title: caseFile.title,
          matterType: caseFile.matterType,
          jurisdiction: caseFile.jurisdiction,
          summary: caseFile.summary,
          issues: caseFile.issues,
          keyFacts: caseFile.keyFacts,
          nextSteps: caseFile.nextSteps,
        }),
    },
    ...previousMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-terra",
        max_completion_tokens: 8192,
        stream: false,
        messages: openAiMessages,
      }),
    });
    if (!response.ok) {
      req.log.error({ status: response.status }, "OpenAI request failed");
      send({
        error: "The AI provider could not complete that response. Try again.",
        configured: true,
        done: true,
      });
      return res.end();
    }
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer =
      payload.choices?.[0]?.message?.content ??
      "I could not produce a response for that message. Try asking in a different way.";
    send({ content: answer });
    await db.insert(caseFileMessages).values({
      caseFileId: id,
      role: "assistant",
      content: answer,
    });
    await db
      .update(caseFiles)
      .set({ updatedAt: new Date(), progress: Math.max(caseFile.progress, 42) })
      .where(eq(caseFiles.id, id));
    send({ done: true });
    return res.end();
  } catch (error) {
    req.log.error({ err: error }, "AI assistant request failed");
    send({
      error: "The AI assistant is temporarily unavailable. Try again shortly.",
      configured: true,
      done: true,
    });
    return res.end();
  }
});

export default router;