import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlignmentQuestion {
  question_id: string;
  question: string;
  context: string;
  answer?: string;
}

interface AlignmentQuestionnaireProps {
  questions: AlignmentQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  onSkip?: () => void;
}

export function AlignmentQuestionnaire({ questions, onSubmit, onSkip }: AlignmentQuestionnaireProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const answeredCount = Object.keys(answers).filter((id) => answers[id]?.trim()).length;
  const canSubmit = answeredCount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Alignment Questions
        </CardTitle>
        <CardDescription>
          Please answer these questions to help us align the agent specification with your expectations. You can skip
          questions you don't want to answer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((question, idx) => {
          const hasAnswer = !!answers[question.question_id]?.trim();
          return (
            <div key={question.question_id} className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">Question {idx + 1}</Badge>
                    {hasAnswer && <Badge variant="secondary" className="text-xs">Answered</Badge>}
                  </div>
                  <h4 className="text-sm font-semibold">{question.question}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{question.context}</p>
                </div>
              </div>
              <Textarea
                placeholder="Your answer..."
                value={answers[question.question_id] || ""}
                onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
                className={cn("min-h-[80px]", hasAnswer && "border-success/50")}
              />
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {answeredCount} of {questions.length} questions answered
          </div>
          <div className="flex gap-2">
            {onSkip && (
              <Button variant="outline" onClick={onSkip}>
                <X className="h-4 w-4 mr-2" />
                Skip All
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              <Send className="h-4 w-4 mr-2" />
              Submit Answers
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

