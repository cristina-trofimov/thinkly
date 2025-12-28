import { Button } from "../ui/button";

interface HomePageBannerProps {
  date: Date;
}

export default function HomePageBanner({ date }: HomePageBannerProps) {
  return (
    <div className="bg-linear-to-b from-primary to-purple-700 p-7 rounded-lg">
      <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium mb-4">
        🎯 Active Now
      </div>
      <h1 className="text-5xl font-bold text-white mb-2">
        Winter Competition 2025
      </h1>
      <p className="text-white text-lg mb-3">
        Challenge yourself and join the competition now by clicking below!
      </p>

      <Button
        variant={"outline"}
        className="rounded-lg font-semibold cursor-pointer text-primary hover:text-primary"
      >
        Join Competition →
      </Button>
    </div>
  );
}
