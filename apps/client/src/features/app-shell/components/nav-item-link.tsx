'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { isNavItemActive, navLinkTitle } from '../lib/nav-active';
import type { NavBadgeLookup } from '../hooks/use-nav-badges';
import type { NavItem } from '../constants/nav-config';
import { NavIconBadge } from './nav-icon-badge';
import { useAppSearchPalette } from '../context/app-search-palette-context';

type NavItemLinkProps = {
  item: NavItem;
  activePath: string;
  badgeLookup: NavBadgeLookup;
  variant: 'sidebar' | 'bottom';
};

function navItemClassName(active: boolean, variant: 'sidebar' | 'bottom') {
  return cn(
    variant === 'sidebar'
      ? 'relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200'
      : 'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 transition-all duration-200',
    active
      ? variant === 'sidebar'
        ? 'bg-primary/15 text-primary'
        : 'text-primary'
      : variant === 'sidebar'
        ? 'text-muted-foreground hover:bg-muted hover:text-foreground'
        : 'text-muted-foreground',
  );
}

export function NavItemLink({ item, activePath, badgeLookup, variant }: NavItemLinkProps) {
  const { icon: Icon, label, href, action, badgeId } = item;
  const { openPalette, open: searchOpen } = useAppSearchPalette();
  const active = action === 'search' ? searchOpen : href ? isNavItemActive(href, activePath) : false;
  const badge = badgeLookup(badgeId);
  const title =
    action === 'search'
      ? `${label} (Ctrl+K)`
      : navLinkTitle(label, badge?.titleSuffix);
  const iconSize = variant === 'sidebar' ? 18 : 20;

  const content = (
    <>
      <span className="relative inline-flex">
        <Icon size={iconSize} strokeWidth={active ? 2.2 : 1.8} />
        {badge ? <NavIconBadge count={badge.count} /> : null}
      </span>
      {variant === 'bottom' ? (
        <span className="truncate text-[10px] font-medium">{label}</span>
      ) : null}
      {variant === 'sidebar' && active ? (
        <span className="absolute inset-y-2.5 left-0 w-0.5 rounded-r-full bg-primary" />
      ) : null}
    </>
  );

  if (action === 'search') {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={searchOpen}
        onClick={openPalette}
        className={cn(navItemClassName(active, variant), 'cursor-pointer')}
      >
        {content}
      </button>
    );
  }

  if (!href) return null;

  return (
    <Link href={href} title={title} className={navItemClassName(active, variant)}>
      {content}
    </Link>
  );
}
