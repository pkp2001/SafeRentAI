import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calculator, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

const incomeSources = [
  "Centrelink JobSeeker",
  "Youth Allowance",
  "Age Pension",
  "Disability Support",
  "Part-time Salary",
  "Full-time Salary",
  "Casual Work",
  "Other",
];

interface AffordabilityCalculatorProps {
  initialRent?: number;
}

export function AffordabilityCalculator({ initialRent = 0 }: AffordabilityCalculatorProps) {
  const [incomeSource, setIncomeSource] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [weeklyRent, setWeeklyRent] = useState<number>(initialRent);
  const [utilities, setUtilities] = useState<number>(100);
  const [transport, setTransport] = useState<number>(80);

  const calculations = useMemo(() => {
    if (!monthlyIncome || !weeklyRent) {
      return null;
    }

    const weeklyIncome = monthlyIncome / 4.33;
    const monthlyRent = weeklyRent * 4.33;
    const monthlyUtilities = utilities;
    const monthlyTransport = transport;
    const totalMonthlyExpenses = monthlyRent + monthlyUtilities + monthlyTransport;
    const remaining = monthlyIncome - totalMonthlyExpenses;
    const affordabilityPercent = (monthlyRent / monthlyIncome) * 100;
    const maxRecommendedRent = monthlyIncome * 0.3 / 4.33;

    let status: "affordable" | "stretching" | "not_recommended";
    if (affordabilityPercent < 30) status = "affordable";
    else if (affordabilityPercent < 40) status = "stretching";
    else status = "not_recommended";

    return {
      weeklyIncome,
      monthlyRent,
      totalMonthlyExpenses,
      remaining,
      affordabilityPercent,
      maxRecommendedRent,
      status,
      breakdown: {
        rent: monthlyRent,
        utilities: monthlyUtilities,
        transport: monthlyTransport,
        remaining: Math.max(0, remaining),
      },
    };
  }, [monthlyIncome, weeklyRent, utilities, transport]);

  const statusConfig = {
    affordable: {
      color: "text-success-500",
      bg: "bg-success-50",
      border: "border-success-200",
      icon: CheckCircle,
      label: "Affordable",
      message: "This rent fits your budget comfortably",
    },
    stretching: {
      color: "text-warning-500",
      bg: "bg-warning-50",
      border: "border-warning-200",
      icon: AlertTriangle,
      label: "Stretching Budget",
      message: "This rent is at the upper limit of your budget",
    },
    not_recommended: {
      color: "text-danger-500",
      bg: "bg-danger-50",
      border: "border-danger-200",
      icon: XCircle,
      label: "Not Recommended",
      message: "This rent exceeds recommended guidelines",
    },
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary-500" />
            Calculate Affordability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Income Source</Label>
            <Select value={incomeSource} onValueChange={setIncomeSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select income source" />
              </SelectTrigger>
              <SelectContent>
                {incomeSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Monthly Income ($)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">$</span>
              <Input
                type="number"
                value={monthlyIncome || ""}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="pl-8"
                placeholder="0"
              />
            </div>
            {monthlyIncome > 0 && (
              <p className="text-xs text-dark-400">
                ≈ {formatCurrency(monthlyIncome / 4.33)}/week
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Weekly Rent ($)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">$</span>
              <Input
                type="number"
                value={weeklyRent || ""}
                onChange={(e) => setWeeklyRent(Number(e.target.value))}
                className="pl-8"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Monthly Utilities ($)</Label>
            <Input
              type="range"
              min={0}
              max={500}
              value={utilities}
              onChange={(e) => setUtilities(Number(e.target.value))}
              className="h-2 accent-primary-500"
            />
            <div className="flex justify-between text-xs text-dark-400">
              <span>$0</span>
              <span className="font-medium text-dark-600">{formatCurrency(utilities)}</span>
              <span>$500</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Monthly Transport ($)</Label>
            <Input
              type="range"
              min={0}
              max={500}
              value={transport}
              onChange={(e) => setTransport(Number(e.target.value))}
              className="h-2 accent-primary-500"
            />
            <div className="flex justify-between text-xs text-dark-400">
              <span>$0</span>
              <span className="font-medium text-dark-600">{formatCurrency(transport)}</span>
              <span>$500</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-6">
        {calculations ? (
          <>
            {/* Affordability Gauge */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="8"
                      />
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke={
                          calculations.status === "affordable"
                            ? "#10B981"
                            : calculations.status === "stretching"
                            ? "#F59E0B"
                            : "#EF4444"
                        }
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${Math.min(calculations.affordabilityPercent, 100) * 2.64} 264`}
                        initial={{ strokeDasharray: "0 264" }}
                        animate={{
                          strokeDasharray: `${Math.min(calculations.affordabilityPercent, 100) * 2.64} 264`,
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        className={`text-3xl font-bold ${statusConfig[calculations.status].color}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {Math.round(calculations.affordabilityPercent)}%
                      </motion.span>
                      <span className="text-xs text-dark-400">of income</span>
                    </div>
                  </div>

                  <div
                    className={`mt-4 px-4 py-2 rounded-full text-sm font-medium ${statusConfig[calculations.status].bg} ${statusConfig[calculations.status].color}`}
                  >
                    {statusConfig[calculations.status].label}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <h3 className="text-sm font-semibold mb-4">Monthly Breakdown</h3>
                {[
                  { label: "Rent", value: calculations.breakdown.rent, color: "bg-primary-500" },
                  { label: "Utilities", value: calculations.breakdown.utilities, color: "bg-warning-500" },
                  { label: "Transport", value: calculations.breakdown.transport, color: "bg-dark-400" },
                  { label: "Remaining", value: calculations.breakdown.remaining, color: "bg-success-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-600">{item.label}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-2 bg-dark-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${item.color}`}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(item.value / monthlyIncome) * 100}%`,
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card className={`border ${statusConfig[calculations.status].border}`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {(() => {
                    const StatusIcon = statusConfig[calculations.status].icon;
                    return <StatusIcon className={`w-5 h-5 mt-0.5 ${statusConfig[calculations.status].color}`} />;
                  })()}
                  <div>
                    <p className="font-medium text-sm mb-1">
                      {statusConfig[calculations.status].message}
                    </p>
                    <p className="text-xs text-dark-500">
                      Max recommended rent: {formatCurrency(calculations.maxRecommendedRent)}/week
                    </p>
                    <p className="text-xs text-dark-500">
                      Remaining after all expenses: {formatCurrency(calculations.remaining)}/month
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center py-12 text-center">
                <TrendingUp className="w-12 h-12 text-dark-300 mb-4" />
                <h3 className="text-lg font-semibold text-dark-700 mb-2">
                  Enter your details
                </h3>
                <p className="text-sm text-dark-400 max-w-xs">
                  Fill in your income and rent details to see if a property fits your budget
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

