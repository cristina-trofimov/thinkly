import { Input } from '../ui/input'
import { Label } from '../ui/label'

const Testcase = () => {
    // const updateTestcase = (
    //     caseID: string,
    //     field: "inputs" | "output",
    //     value: string
    // ) => {
    //     // TODO: FIX THIS
    //     setTestcases((prev) =>
    //       prev.map((c) =>
    //         c.caseID === caseID ? { ...c, [field]: value } : c
    //     ))
    // }

    return (
        <div className='mt-3 space-y-6' >
            <div className='space-y-2' >
                <Label>Input(s)</Label>
                <Input />
            </div>
            <div className='space-y-2' >
                <Label>Expected output</Label>
                <Input id='expected_output' />
            </div>
        </div>
    )
}

export default Testcase