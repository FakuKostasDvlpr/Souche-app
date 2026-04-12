import { cn } from '@/lib/utils';
import { View } from 'react-native';

function Skeleton({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return <View className={cn('bg-neutral-800 animate-pulse rounded-md', className)} {...props} />;
}

function HomeSkeleton() {
  return (
    <View className="flex-1 bg-souche-black px-5 pt-5">
      {/* Announcement bar */}
      <Skeleton className="h-10 w-full rounded-lg mb-5" />

      {/* Header */}
      <View className="flex-row items-center justify-between mb-5">
        <View>
          <Skeleton className="h-7 w-48 rounded-lg mb-2" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </View>
        <Skeleton className="h-11 w-11 rounded-full" />
      </View>

      {/* Stats cards */}
      <View className="flex-row gap-3 mb-5">
        <Skeleton className="flex-1 h-28 rounded-2xl" />
        <Skeleton className="flex-1 h-28 rounded-2xl" />
      </View>

      {/* Winner banner */}
      <Skeleton className="h-28 w-full rounded-2xl mb-6" />

      {/* Menu section */}
      <Skeleton className="h-5 w-32 rounded-md mb-3" />
      <View className="flex-row gap-3">
        <Skeleton className="w-44 h-44 rounded-2xl" />
        <Skeleton className="w-44 h-44 rounded-2xl" />
      </View>

      {/* News */}
      <Skeleton className="h-5 w-28 rounded-md mt-6 mb-3" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </View>
  );
}

function MenuSkeleton() {
  return (
    <View className="flex-1 bg-souche-black px-5 pt-3">
      <Skeleton className="h-4 w-64 rounded-md mb-4" />
      <View className="flex-row gap-2 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-20 rounded-full" />
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-64 w-full rounded-2xl mb-3" />
      ))}
    </View>
  );
}

function EventosSkeleton() {
  return (
    <View className="flex-1 bg-souche-black px-5 pt-4">
      <Skeleton className="h-4 w-64 rounded-md mb-4" />
      <Skeleton className="h-12 w-full rounded-2xl mb-5" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-52 w-full rounded-2xl mb-4" />
      ))}
    </View>
  );
}

function CardSkeleton() {
  return (
    <View className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <View className="flex-row items-center gap-3 mb-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <View className="flex-1">
          <Skeleton className="h-4 w-3/4 rounded-md mb-2" />
          <Skeleton className="h-3 w-1/2 rounded-md" />
        </View>
      </View>
      <Skeleton className="h-3 w-full rounded-md mb-2" />
      <Skeleton className="h-3 w-5/6 rounded-md" />
    </View>
  );
}

export { Skeleton, HomeSkeleton, MenuSkeleton, EventosSkeleton, CardSkeleton };
