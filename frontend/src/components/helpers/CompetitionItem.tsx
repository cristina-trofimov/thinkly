import {
  ItemContent,
  ItemTitle,
  ItemDescription,
  Item,
} from "../ui/item";

interface CompetitionItemProps {
  title: string;
  location?: string;
}

export default function CompetitionItem({ title, location }: Readonly<CompetitionItemProps>) {
  return (
    <Item variant="outline" className="bg-muted p-3">
      <ItemContent>
        <ItemTitle className="font-semibold">{title}</ItemTitle>
        <ItemDescription>{location}</ItemDescription>
      </ItemContent>
    </Item>
  );
}