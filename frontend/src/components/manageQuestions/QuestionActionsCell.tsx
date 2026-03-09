"use client";

import React, { type FC } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { Question } from "@/types/questions/Question.type";
import { useNavigate } from "react-router-dom";

interface ActionsCellProps {
  question: Question;
  onDelete?: (questionId: number) => void;
}

const ActionsCell: FC<ActionsCellProps> = (props) => {
  const { question, onDelete } = props;
  const navigate = useNavigate();

  return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() =>
              navigator.clipboard.writeText(question.question_id.toString())
            }
          >
            Copy question ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />  
        <DropdownMenuItem
          onClick={() => navigate(`./editQuestion/${question.question_id}`)}
        >
            Edit question as JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete?.(question.question_id)} className="text-destructive">
            Delete question
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
};

export default ActionsCell;