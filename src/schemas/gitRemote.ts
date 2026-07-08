import { z } from "zod";

export const GitRemoteSchema = z.string().min(1).refine(
    (value) => 
        value.startsWith("git@") || value.startsWith("https://") || value.startsWith("http://") || value.startsWith("file://"),
    
    {
        message:
            "Expect a Git remote URL: SSH git@, https, http, or file://",
    }
);


export type GitRemote = z.infer<typeof GitRemoteSchema>;

