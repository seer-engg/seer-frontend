import { Code } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CodeBlockSectionProps {
  pythonCode: string;
  setPythonCode: (value: string) => void;
}

export function CodeBlockSection({ pythonCode, setPythonCode }: CodeBlockSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="python-code" className="flex items-center gap-2">
          <Code className="w-4 h-4" />
          Python Code
        </Label>
        <Textarea
          id="python-code"
          value={pythonCode}
          onChange={e => setPythonCode(e.target.value)}
          placeholder="# Your Python code here&#10;result = input_data * 2"
          className="font-mono text-xs"
          rows={12}
        />
      </div>
    </div>
  );
}

