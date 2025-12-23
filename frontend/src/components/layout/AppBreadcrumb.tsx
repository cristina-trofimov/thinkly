import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react";

interface BreadcrumbItemData {
  title: string;
  href: string;
}

interface BreadcrumbWithCustomSeparatorProps {
  items: BreadcrumbItemData[];
}

export function AppBreadcrumbs({ items }: Readonly<BreadcrumbWithCustomSeparatorProps>) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Breadcrumb className="px-4 py-3">
        <BreadcrumbList>
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            
            return (
              <React.Fragment key={item.title}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-primary font-medium">{item.title}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink 
                      href={item.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {item.title}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </nav>
  );
}