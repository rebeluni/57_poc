// ==============================================================================
// Physique 57 · People Desk
// Optional AI Fallback Classifier (Google Gemini Free Tier)
// ==============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { DepartmentCategory } from './config';
import { CategorisationResult } from './types';

/**
 * Optional AI classifier called only when rule-based confidence < 0.60.
 * Operates strictly server-side behind the GEMINI_API_KEY environment flag.
 * If key is missing or call fails, gracefully falls back to Human Triage.
 */
export async function classifyWithGemini(
  subject: string,
  description: string
): Promise<CategorisationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const prompt = `You are an internal helpdesk triage classifier for Physique 57, a luxury barre fitness brand.
Categorize the following employee request into exactly one of: HR, IT, Payroll, Operations, Other.

Departments:
- HR: Leaves, vacations, onboarding, policy, resignation, benefits, medical insurance, attendance regularisation.
- IT: Laptops, Wi-Fi, passwords, POS apps, software, email access, printers, hardware.
- Payroll: Salaries, payslips, reimbursements, tax/TDS, form 16, deductions, delayed credits.
- Operations: Studio barre maintenance, mirrors, sound system/amps, props, cleaning, studio AC, facility repair.
- Other: General inquiries, visitor parking, anything else.

Request Subject: "${subject}"
Request Description: "${description}"

Respond ONLY with a JSON object in this exact schema:
{
  "category": "HR" | "IT" | "Payroll" | "Operations" | "Other",
  "confidence": number between 0.0 and 1.0,
  "reason": "short 1-sentence reasoning"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    const validCategories: DepartmentCategory[] = ['HR', 'IT', 'Payroll', 'Operations', 'Other'];
    const category: DepartmentCategory = validCategories.includes(parsed.category)
      ? parsed.category
      : 'Other';

    return {
      category,
      confidence: typeof parsed.confidence === 'number' ? Math.min(1.0, Math.max(0.1, parsed.confidence)) : 0.8,
      matchedKeywords: ['AI-suggested'],
      source: 'ai',
      reason: `AI classification: ${parsed.reason || 'Semantic context analysis'}`,
    };
  } catch (error) {
    console.warn('Optional Gemini AI classification skipped or failed:', error);
    return null;
  }
}
