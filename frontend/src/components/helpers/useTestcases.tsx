import { getTestcases } from "@/api/TestCasesAPI";
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

        let newID: number;
        if (activeTestcase?.test_case_id === tcr.test_case_id) {
            // The active case is being removed — pick the neighbour
            if (idxToRemove === 0) {
                newID = idxToRemove + 1; // first in list → take the next one
            } else {
                newID = idxToRemove - 1; // not first → take the one before
            }
        } else {
            // Active case is not being removed — keep it selected
            newID = testcases.findIndex(tc => tc.test_case_id === activeTestcase?.test_case_id)
        }

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