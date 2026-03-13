import { Skeleton } from "@/components/ui/skeleton";

export default function IncidentsLoading() {
  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-[250px] mb-2" />
          <Skeleton className="h-4 w-[400px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-[120px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>

      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4 mb-4">
            <Skeleton className="h-10 w-[300px]" />
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[150px] ml-auto" />
          </div>
          <div className="flex items-center space-x-4 h-6">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>

        <div>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border-b last:border-0 hover:bg-muted/50">
              <Skeleton className="h-5 w-12" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
