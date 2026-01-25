import {
  ItemContent,
  ItemTitle,
  ItemDescription,
  Item,
} from "../ui/item";

interface CompetitionItemProps {
  title: string;
  date: string;
}

export default function CompetitionItem({ title, date }: Readonly<CompetitionItemProps>) {
  return (
    <Item variant="outline" className="bg-white p-3">
      <ItemContent>
        <ItemTitle className="font-semibold">{title}</ItemTitle>
        <ItemDescription>{date}</ItemDescription>
      </ItemContent>
    </Item>
  );
}