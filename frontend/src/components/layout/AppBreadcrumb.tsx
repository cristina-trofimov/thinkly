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
    <Breadcrumb className="px-4 pt-4 pb-2">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <React.Fragment key={item.title}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-primary">{item.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={item.href}>{item.title}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}