import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";

export type ManageItem = {
  name: string;
  info: string;
  href?: string;
  avatarUrl?: string;
  color?: string;
};

export interface ManageCardProps {
  title: string;
  icon: LucideIcon;
}

export const ManageCard = ({ title, icon: Icon }: ManageCardProps) => (
  <Item variant="outline" className="bg-white hover:bg-primary/5 transition-colors">
    <ItemMedia>
      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="size-4" />
      </div>
    </ItemMedia>
    <ItemContent>
      <ItemTitle className="font-semibold">{title}</ItemTitle>
    </ItemContent>
    <ItemActions>
      <ChevronRightIcon className="size-4 text-primary" />
    </ItemActions>
  </Item>
);
