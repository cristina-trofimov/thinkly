import { getTestcases } from "@/api/QuestionsAPI";
import type { TestCase } from "@/types/questions/QuestionPagination.type";
import { useEffect, useRef, useState } from "react";

export function useTestcases(question_id?: number) {
    const [ testcases, setTestcases ] = useState<TestCase[]>([])
    const [ loading, setLoading ] = useState(true)
    const initRef = useRef(false)
    const [activeTestcase, setActiveTestcase] = useState<TestCase | undefined>(undefined);

    useEffect(() => {
        if (!question_id) {
            setLoading(false)
            return
        }

        setLoading(true)
        getTestcases(question_id)
            .then(setTestcases)
            .finally(() => setLoading(false))
    }, [question_id]);

    useEffect(() => {
        // To load default test case
        if (!initRef.current && testcases.length > 0) {
            setActiveTestcase(testcases[0])
            initRef.current = true
        }
    }, [testcases]);

    const addTestcase = () => {
        const newCase: TestCase = {
            test_case_id: -1,
            question_id: -1,
            input_data: {},
            expected_output: "",
        }
        setTestcases((prev) => [...prev, newCase])
        setActiveTestcase(newCase)
    }

    const removeTestcase = (tcr: TestCase) => {
        if (testcases.length === 1) return

        const idxToRemove = testcases.findIndex((tc) => tc.test_case_id === tcr.test_case_id)

        const filtered = testcases.filter((tc) => tc.test_case_id !== tcr.test_case_id)

        setTestcases(filtered)

        const newID = (activeTestcase?.test_case_id === tcr.test_case_id) // is the active case being removed
                    ? (idxToRemove === 0) // is it the first in the list
                        ? (idxToRemove - 1) // not first in the list -> get index before
                        : (idxToRemove + 1) // first in the list -> get next one
                    : testcases.findIndex(tc => tc.test_case_id === activeTestcase?.test_case_id) // case being deleted is not active -> keep active

        setActiveTestcase(filtered[newID] ?? filtered[0])
    }

    const updateTestcase = (
        tc: TestCase | undefined,
        field: "input_data" | "expected_output",
        value: string
    ) => {
        if (!tc) return
        setTestcases((prev) =>
            prev.map((c) =>
                c.test_case_id === tc.test_case_id ? { ...c, [field]: value } : c
            )
        )
    }

    return { loading, testcases, addTestcase, removeTestcase, updateTestcase, activeTestcase, setActiveTestcase }
}