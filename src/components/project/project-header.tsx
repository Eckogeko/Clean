"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, BreadcrumbItem } from "@/components/navigation/breadcrumbs";

interface ProjectHeaderProps {
  projectName: string;
  teamName?: string;
  breadcrumbItems?: BreadcrumbItem[];
  showBackButton?: boolean;
  children?: React.ReactNode;
}

export function ProjectHeader({
  projectName,
  teamName,
  breadcrumbItems,
  showBackButton = true,
  children,
}: ProjectHeaderProps) {
  const router = useRouter();

  const defaultBreadcrumbs: BreadcrumbItem[] = teamName
    ? [
        { label: teamName, href: "/" },
        { label: projectName },
      ]
    : [{ label: projectName }];

  const items = breadcrumbItems || defaultBreadcrumbs;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center gap-4">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to dashboard</span>
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <Breadcrumbs items={items} />
        </div>

        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}
