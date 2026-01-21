import { getTestcases } from "@/api/QuestionsAPI";
import type { TestcaseType } from "@/types/questions/Testcases.type";
import { useEffect, useRef, useState } from "react";

export function useTestcases(question_id?: number) {
    const [ testcases, setTestcases ] = useState<TestcaseType[]>([])
    const [ loading, setLoading ] = useState(true)
    const initRef = useRef(false)
    const [activeTestcase, setActiveTestcase] = useState<string>("");

    useEffect(() => {
        if (!question_id) return;
        
        setLoading(true)
        getTestcases(question_id)
            .then(setTestcases)
            .finally(() => setLoading(false))
    }, [question_id]);

    useEffect(() => {
        // To load default test case
        if (!initRef.current && testcases.length > 0) {
            setActiveTestcase(testcases[0]?.caseID)
            initRef.current = true
        }
    }, [testcases]);

    const addTestcase = () => {
        const newCase: TestcaseType = {
            test_case_id: -1,
            question_id: -1,
            caseID: `Case ${testcases.length + 1}`,
            input_data: "",
            expected_output: "",
        }
        setTestcases((prev) => [...prev, newCase])
        setActiveTestcase(newCase.caseID)
    }

    const removeTestcase = (caseID: string) => {
        if (testcases.length === 1) return
    
        const filtered = testcases.filter((c) => c.caseID !== caseID)
        let idx = -1
    
        testcases.map((c) => {
            if (c.caseID === caseID) {
                idx = testcases.indexOf(c)
            }
        })
    
        for (let i = idx; i < filtered.length; i++) {
            filtered[i].caseID = `Case ${i + 1}`
        }
    
        setTestcases(filtered)
    
        const newID = (activeTestcase === caseID && idx !== 0) ? idx : idx - 1
        // TODO: happens regardless of active testcase tab => onValueChange on Tablist
        // setActiveTestcase(testcases[newID].caseID)
        setActiveTestcase(testcases[newID].caseID)
    }

    const updateTestcase = (
        caseID: string,
        field: "input_data" | "expected_output",
        value: string
    ) => {
        setTestcases((prev) =>
            prev.map((c) =>
                c.caseID === caseID ? { ...c, [field]: value } : c
            )
        )
    }

    return { loading, testcases, addTestcase, removeTestcase, updateTestcase, activeTestcase, setActiveTestcase }
}