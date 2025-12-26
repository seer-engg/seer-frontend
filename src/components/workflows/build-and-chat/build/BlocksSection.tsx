import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { BuiltInBlock } from '../types';

interface BlocksSectionProps {
  blocks: BuiltInBlock[];
  onSelectBlock: (block: BuiltInBlock) => void;
}

export function BlocksSection({ blocks, onSelectBlock }: BlocksSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2 text-left">Blocks</h3>
      <div className="grid grid-cols-2 gap-2">
        {blocks.map((block) => (
          <Tooltip key={block.type}>
            <TooltipTrigger asChild>
              <Card
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onSelectBlock(block)}
              >
                <CardContent className="p-2">
                  <div className="flex items-center gap-2">
                    {block.icon}
                    <p className="text-sm font-medium">{block.label}</p>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{block.description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

