import { z } from "zod";

export const SourceSchema = z.object({
    title: z.string(),
    path: z.string(),
    snippet: z.string()
}); 

export const FinalAnswerSchema = z.object({
    shouldContinue: z.boolean(),
    answer: z.string().nullable(),
    sources : z.array(SourceSchema),
    toolCalls: z.array(z.string()),
    blocked: z.boolean(),
    error: z.object({
        code: z.string(),
        message: z.string()
    }).nullable()
});

export type FinalAnswer = z.infer<typeof FinalAnswerSchema>;
export type Source = z.infer<typeof SourceSchema>;

export function forcedErrorPath(params: {
    code: string;
    message: string;
    blocked?: boolean;
    toolCalls?: string[];
    sources?: Source[];
}) : FinalAnswer {
    return {
        shouldContinue: false,
        answer: null,
        sources: params.sources ?? [],
        toolCalls: params.toolCalls ?? [],
        blocked: params.blocked ?? false,
        error: {
            code: params.code,
            message: params.message
        }
    };
}

export function safeParseFinalAnswer(value: unknown): FinalAnswer {
    const parsed = FinalAnswerSchema.safeParse(value); 
    
    if (!parsed.success){
        return forcedErrorPath({
            code: "INVALID_MODEL_OUTPUT",
            message: parsed.error.message,
            blocked: false 
        });
    }

    return parsed.data; 
}