import { Input } from '../ui/input'
import { Label } from '../ui/label'

const Testcase = () => {
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