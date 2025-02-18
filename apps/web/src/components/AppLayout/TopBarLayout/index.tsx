import React from "react";

import { ThemeModeButton } from "~/components/ThemeModeButton";
import { useIsHomepage } from "~/hooks/useIsHomePage";
import { ExplorerDetails } from "../../ExplorerDetails";
import { NavMenusSection } from "../../NavMenusSection";
import { CompactTopBar } from "./CompactTopBar";
import { TopBar } from "./TopBar";

export const TopBarLayout: React.FC = () => {
  const isHomepage = useIsHomepage();

  if (isHomepage) {
    return (
      <nav className="z-10 flex h-16 w-full items-center justify-between px-4">
        <div className="hidden md:flex">
          <ExplorerDetails />
        </div>
        <div className="flex items-center gap-3">
          <NavMenusSection />
          <ThemeModeButton />
        </div>
      </nav>
    );
  }

  return (
    <>
      <div
        className={`z-10 hidden h-16 w-full items-center justify-between sm:block`}
      >
        <TopBar />
      </div>
      <CompactTopBar />
    </>
  );
};
