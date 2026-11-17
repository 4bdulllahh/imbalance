import { z } from "zod";
import { askAi } from "@/lib/ai";
import { filtersUrl, FILTERS_PROMPT, parseFilters } from "@/lib/filters";
import { getDb } from "@/lib/db";
import { isSameOrigin } from "@/lib/same-origin";
import { nextSteps } from "@/lib/timeline";
import { listHoldings, portfolio } from "@/lib/tracker";
import { errorResponse, forbidden } from "../errors";

const bodySchema = z.object({
  topic: z.enum(["contract", "deal", "question", "filters"]),
  question: z.string().trim().max(1000).default(""),
  /** Numbers the page already computed (a contract or a deal). Passed through as JSON. */
  data: z.unknown().optional(),
});

const TOPIC_INTRO: Record<"contract" | "deal" | "question", string> = {
  contract:
    "Here is a trade-up contract the app found. Comment on whether it is worth doing.",
  deal: "Here is a skin the app flagged as cheap. Comment on whether it is worth buying to flip.",
  question:
    "The user has a question. Their tracker summary is attached for context.",
};

/** What the user holds, in numbers the app computed, for free-form questions. */
function trackerSummary() {
  const db = getDb();
  const holdings = listHoldings(db);
  const held = holdings.filter((h) => h.status === "holding");
  return {
    portfolioCents: portfolio(holdings, () => null),
    holding: held.slice(0, 40).map((h) => ({
      item: h.marketHashName,
      float: h.float,
      paidCents: h.costCents,
      tradableAt: new Date(h.tradableAt).toISOString().slice(0, 10),
    })),
    nextUnlock: nextSteps(
      held.map((h) => ({ ...h, valueCents: null })),
      Date.now(),
    ).comeBackAt,
  };
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbidden();
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) throw new Error("Type a question first.");
    const { topic, question, data } = parsed.data;
    if (topic === "filters") {
      if (!question) throw new Error("Type what you are looking for first.");
      const filters = parseFilters(
        (await askAi(question, FILTERS_PROMPT)).text,
      );
      const url = filters && filtersUrl(filters);
      if (!url)
        throw new Error(
          "That doesn't sound like a trade-up or deal search. Try Ask instead.",
        );
      return Response.json({ url });
    }
    if (topic === "question" && !question)
      throw new Error("Type a question first.");
    const facts = JSON.stringify(
      topic === "question" ? trackerSummary() : data,
    );
    if (facts.length > 20_000)
      throw new Error(
        "That is too much data to send to the AI. Pick one contract or deal.",
      );
    const prompt = [
      TOPIC_INTRO[topic],
      "Values ending in Cents are US cents (divide by 100 for dollars). Probabilities are 0 to 1.",
      `Data: ${facts}`,
      question ? `User's question: ${question}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    return Response.json(await askAi(prompt));
  } catch (err) {
    return errorResponse(err, 400);
  }
}
