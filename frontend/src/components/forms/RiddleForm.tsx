import { HelpCircle, CheckCircle2} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Riddle } from "@/types/riddle/Riddle.type";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";



interface RiddleProps {
    riddle: Riddle;
    onSolved?: () => void;
}

export default function RiddleUserForm({ riddle, onSolved }: Readonly<RiddleProps>) {
    const [guess, setGuess] = useState("");
    const [isSolved, setIsSolved] = useState(false);

    // --- Validation Logic ---
    function normalizeString(str: string) {
        // Remove all whitespace and convert to lowercase for loose comparison
        return str.replace(/\s+/g, "").toLowerCase();
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        if (!guess.trim()) {
            toast.error("Please enter an answer!");
            return;
        }

        const normalizedGuess = normalizeString(guess);
        const normalizedAnswer = normalizeString(riddle.answer);

        if (normalizedGuess === normalizedAnswer) {
            setIsSolved(true);
            toast.success("Correct! Great job.");
            onSolved?.();
        } else {
            toast.error("Wrong answer, try again!");
            setGuess(""); // Clear the input to prompt another try
        }
    }

    // --- File Rendering Logic ---
    function renderAttachment(url: string) {
        // Strip query parameters to reliably check the extension
        const cleanUrl = url.split("?")[0].toLowerCase();

        if (cleanUrl.match(/\.(mp4|webm|ogg|mov)$/)) {
            return (
                <video controls className="w-full rounded-lg max-h-96 object-contain bg-black/5 border">
                    <source src={url} />
                    Your browser does not support the video tag.
                </video>
            );
        }

        if (cleanUrl.match(/\.(mp3|wav|ogg)$/)) {
            return (
                <audio controls className="w-full outline-none">
                    <source src={url} />
                    Your browser does not support the audio element.
                </audio>
            );
        }

        if (cleanUrl.match(/\.pdf$/)) {
            return (
                <iframe
                    src={`${url}#toolbar=0`}
                    className="w-full h-96 rounded-lg border bg-muted/20"
                    title="Riddle PDF Attachment"
                />
            );
        }

        // Fallback to Image
        return (
            <img
                src={url}
                alt="Riddle Attachment"
                className="w-full rounded-lg max-h-96 object-contain bg-black/5 border"
                loading="lazy"
            />
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-6">
            <Card className={`rounded-2xl shadow-sm transition-colors duration-300 ${isSolved ? "border-green-500/50 bg-green-50/30" : ""}`}>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        {isSolved ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : (
                            <HelpCircle className="w-6 h-6 text-primary" />
                        )}
                        Riddle #{riddle.id}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Attachment Viewer */}
                    {riddle.file && (
                        <div className="space-y-3">
                            <Label className="text-muted-foreground">Clue / Attachment</Label>
                            <div className="overflow-hidden rounded-lg">
                                {renderAttachment(riddle.file)}
                            </div>
                            <Separator className="mt-6" />
                        </div>
                    )}

                    {/* Question Display */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm uppercase tracking-wider">The Question</Label>
                        <p className="text-2xl font-semibold leading-snug">
                            {riddle.question}
                        </p>
                    </div>

                    {/* Answer Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="guess">Your Answer</Label>
                            <Input
                                id="guess"
                                placeholder={isSolved ? "You solved it!" : "Type your guess here..."}
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                disabled={isSolved}
                                className={isSolved ? "bg-green-500/10 text-green-700 border-green-500/30 font-medium" : ""}
                                autoFocus
                                autoComplete="off"
                            />
                        </div>

                        {!isSolved ? (
                            <Button type="submit" className="w-full" size="lg">
                                Submit Answer
                            </Button>
                        ) : (
                            <div className="w-full p-3 rounded-lg bg-green-500/10 text-green-700 border border-green-500/20 text-center font-medium flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                Riddle Solved!
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}