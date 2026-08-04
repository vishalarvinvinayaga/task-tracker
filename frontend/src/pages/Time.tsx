import { Header } from "../components/layout/Header";
import { TimeBreakdown } from "../components/time/TimeBreakdown";
import { TrendChart } from "../components/dashboard/TrendChart";

export function Time() {
  return (
    <>
      <Header title="Time" />
      <div className="space-y-6 p-6">
        <TrendChart days={30} />
        <TimeBreakdown />
      </div>
    </>
  );
}
