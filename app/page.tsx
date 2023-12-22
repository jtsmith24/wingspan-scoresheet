import SumTable from '@/components/sum-table/SumTable'

export default function Home() {
  const inputColumns = 5;
  const inputRows = 6;
  const rowHeaders = [
    { full: "Birds", icon: "fas fa-feather", color: "text-green-500" },
    { full: "Bonus Cards", icon: "fas fa-b", color: "text-green-500" },
    {
      full: "End-Of-Round Goals",
      icon: "fas fa-flag-checkered",
      color: "text-green-500",
    },
    { full: "Eggs", icon: "fas fa-egg", color: "text-blue-500" },
    { full: "Food On Cards", icon: "fas fa-wheat-awn", color: "text-blue-500" },
    { full: "Tucked Cards", icon: "fas fa-layer-group", color: "text-blue-500" },
  ];


  return (
    <main>
      <SumTable
      rowHeaders={rowHeaders}
      columns={inputColumns}
      rows={inputRows} />
    </main>
  )
}
