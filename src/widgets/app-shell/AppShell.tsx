import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, UserCircle } from "lucide-react";
import type { User } from "../../entities/user";
import HomePage from "../home/HomePage";
import ProfilePage from "../profile/ProfilePage";
import SettingsPage from "../settings/SettingsPage";
import CommerceToolkitModule from "../commerce-toolkit/CommerceToolkitModule";
import DesignReferenceModule from "../design-reference/DesignReferenceModule";
import DesignTemplateModule from "../design-template/DesignTemplateModule";
import PrototypeModule from "../prototype/PrototypeModule";
import PrototypeNoteModule from "../prototype-note/PrototypeNoteModule";
import TestingModule from "../testing/TestPlaybookModule";
import AxPlaybookModule from "../ax/AxPlaybookModule";
import DevopsPlaybookModule from "../devops/DevopsPlaybookModule";
import CicdPlaybookModule from "../cicd/CicdPlaybookModule";
import MybatisPlaybookModule from "../architecture/MybatisPlaybookModule";
import ApiDocModule from "../apidoc/ApiDocModule";
import ApiExcelModule from "../api-excel/ApiExcelModule";
import CommercePlaybookModule from "../commerce/CommercePlaybookModule";
import DbPlaybookModule from "../db/DbPlaybookModule";
import SqlPlaybookModule from "../sql/SqlPlaybookModule";
import DebuggingHistoryModule from "../debugging/DebuggingHistoryModule";
import TechnicalDebtModule from "../technical-debt/TechnicalDebtModule";
import ChatModule from "../chat/ChatModule";
import CommonComponentModule from "../common-component/CommonComponentModule";
import TutoringModule from "../tutoring/TutoringModuleSimple";
import ChallengePlaybookModule from "../challenge/ChallengePlaybookModule";
import WindowControls from "../../shared/ui/WindowControls";
import { useAppSettingsStore } from "../../shared/lib/app-settings-store";
import { getRailTheme } from "../../shared/lib/rail-themes";
import { useAppUpdate } from "../../shared/lib/useAppUpdate";
import { APP_MODULES, isAppModuleId, type AppModuleId } from "../../shared/config/app-modules";
import { APP_PROFILE } from "../../shared/config/app-profile";

type Props = {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
};

type ViewId = "home" | "profile" | "settings" | AppModuleId;

function AppShell({ user, onUserUpdate, onLogout }: Props) {
  const [active, setActive] = useState<ViewId>(() => {
    const requestedView = new URLSearchParams(window.location.search).get("view");
    if (requestedView === "home" || requestedView === "profile" || requestedView === "settings") return requestedView;
    return requestedView && isAppModuleId(requestedView) ? requestedView : "home";
  });
  const [prototypeNoteTargetId, setPrototypeNoteTargetId] = useState<
    string | null
  >(null);
  const [prototypeNoteMenuKey, setPrototypeNoteMenuKey] = useState(0);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const moduleOrder = useAppSettingsStore((s) => s.moduleOrder);
  const hiddenModuleIds = useAppSettingsStore((s) => s.hiddenModuleIds);
  const orderedModules = [...APP_MODULES].sort((a, b) => {
    const aIndex = moduleOrder.indexOf(a.id);
    const bIndex = moduleOrder.indexOf(b.id);
    return (
      (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) -
      (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex)
    );
  });
  const visibleModules = orderedModules.filter(
    (module) => !hiddenModuleIds.includes(module.id),
  );
  const railTheme = getRailTheme(useAppSettingsStore((s) => s.railTheme));
  const displayName = user.name || user.email;
  const roleName = user.role === "admin" ? "관리자" : "사용자";

  const appUpdate = useAppUpdate();
  const appVersion = appUpdate.state.currentVersion;

  function openView(id: ViewId) {
    if (id === "prototype-note") {
      setPrototypeNoteTargetId(null);
      setPrototypeNoteMenuKey((key) => key + 1);
    }
    setActive(id);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      appUpdate.checkOnceOnStartup();
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [appUpdate.checkOnceOnStartup]);

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  return (
    <div className="relative flex h-screen overflow-hidden">
      <nav
        className="flex w-[72px] shrink-0 flex-col items-center text-text-on-brand"
        style={{ backgroundImage: railTheme.gradient }}
      >
        <div className="flex h-12 w-full shrink-0 items-center justify-center border-b border-[color-mix(in_srgb,var(--primary-foreground)_10%,transparent)]">
          <button
            onClick={() => openView("home")}
            title="홈"
            className={
              "flex h-[44px] w-[44px] items-center justify-center text-[22px] shadow-sm transition-all duration-300 ease-in-out " +
              (active === "home"
                ? "rounded-[14px] bg-[color-mix(in_srgb,var(--primary-foreground)_30%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--primary-foreground)_40%,transparent)]"
                : "rounded-[22px] bg-[color-mix(in_srgb,var(--primary-foreground)_15%,transparent)] hover:rounded-[14px] hover:bg-[color-mix(in_srgb,var(--primary-foreground)_25%,transparent)]")
            }
          >
            🛒
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto py-1.5">
          {visibleModules.map((module) => {
            const isActive = module.id === active;
            return (
              <button
                key={module.id}
                onClick={() => openView(module.id)}
                title={module.label}
                className={
                "group relative flex h-[44px] w-[50px] flex-col items-center justify-center gap-0.5 transition-all duration-300 ease-in-out " +
                  (isActive
                    ? "rounded-[15px] bg-[color-mix(in_srgb,var(--primary-foreground)_25%,transparent)] text-text-on-brand"
                    : "rounded-[24px] text-[color-mix(in_srgb,var(--primary-foreground)_80%,transparent)] hover:rounded-[15px] hover:bg-[color-mix(in_srgb,var(--primary-foreground)_15%,transparent)] hover:text-text-on-brand")
                }
              >
                <span
                  className={
                    "absolute -left-2.5 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-text-on-brand transition-all duration-300 ease-in-out " +
                    (isActive ? "h-6" : "h-0 group-hover:h-3")
                  }
                />
                <module.icon className="size-[18px] shrink-0" strokeWidth={2} />
                <span className="w-full overflow-hidden px-0.5 text-center text-[9px] font-semibold leading-[1.05] [word-break:keep-all]">
                  {module.label}
                </span>
              </button>
            );
          })}
        </div>

        <div
          ref={accountRef}
          className="relative flex w-full flex-wrap items-center justify-center gap-1.5 border-t border-[color-mix(in_srgb,var(--primary-foreground)_10%,transparent)] px-1 py-2"
        >
          <button
            onClick={() => void appUpdate.installUpdate()}
            disabled={appUpdate.state.status !== "available" || appUpdate.busy}
            title={
              appUpdate.state.status === "available"
                ? `새 버전 v${appUpdate.state.availableVersion} 설치`
                : appUpdate.state.status === "checking"
                  ? "업데이트 확인 중"
                  : "업데이트 없음"
            }
              className={
              "grid h-[24px] w-[48px] place-items-center rounded-md border text-[9px] font-black leading-none shadow-sm transition-colors " +
              (appUpdate.state.status === "available"
                ? "border-brand-border bg-brand-glass text-brand-primary hover:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]"
                : "cursor-default border-[color-mix(in_srgb,var(--primary-foreground)_35%,transparent)] bg-[color-mix(in_srgb,var(--primary-foreground)_20%,transparent)] text-[color-mix(in_srgb,var(--primary-foreground)_75%,transparent)]")
            }
          >
            <span>
              {appUpdate.state.status === "checking"
                ? "확인"
                : appUpdate.state.status === "downloading"
                  ? `${appUpdate.state.progress}%`
                  : appUpdate.state.status === "available"
                    ? "업데이트"
                    : "최신"}
            </span>
          </button>
          {appVersion && (
            <span
              title={`${APP_PROFILE.displayName} v${appVersion}`}
              className="max-h-3 select-none overflow-hidden text-[9px] font-bold tabular-nums text-[color-mix(in_srgb,var(--primary-foreground)_85%,transparent)]"
            >
              v{appVersion}
            </span>
          )}
          <button
            onClick={() => setActive("settings")}
            title="설정"
            className={
              "flex h-[34px] w-[34px] items-center justify-center text-[15px] transition-all duration-200 " +
              (active === "settings"
                ? "rounded-[14px] bg-[color-mix(in_srgb,var(--primary-foreground)_25%,transparent)] text-text-on-brand ring-1 ring-[color-mix(in_srgb,var(--primary-foreground)_50%,transparent)]"
                : "rounded-[20px] text-[color-mix(in_srgb,var(--primary-foreground)_80%,transparent)] hover:rounded-[14px] hover:bg-[color-mix(in_srgb,var(--primary-foreground)_15%,transparent)] hover:text-text-on-brand")
            }
          >
            <Settings className="size-[18px]" strokeWidth={2} />
          </button>
          <button
            onClick={() => setAccountOpen((open) => !open)}
            title={`${displayName} · ${roleName}`}
            className={
              "grid h-[34px] w-[34px] place-items-center rounded-lg border p-0 text-[9px] font-extrabold transition-all " +
              (accountOpen || active === "profile"
                ? "border-[color-mix(in_srgb,var(--primary-foreground)_60%,transparent)] bg-surface-raised text-text-primary shadow-lg"
                : "border-transparent bg-transparent text-[color-mix(in_srgb,var(--primary-foreground)_85%,transparent)] hover:border-[color-mix(in_srgb,var(--primary-foreground)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary-foreground)_20%,transparent)] hover:text-text-on-brand")
            }
          >
            <span className="grid h-[28px] w-[28px] place-items-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--primary-foreground)_30%,transparent)] bg-surface-raised text-[11px] font-black uppercase text-text-primary">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                displayName.charAt(0) || "U"
              )}
            </span>
            <span className="sr-only max-w-[50px] overflow-hidden text-ellipsis whitespace-nowrap">
              {roleName}
            </span>
          </button>
          {accountOpen && (
            <div className="absolute bottom-2 left-[calc(100%+12px)] z-30 w-[248px] overflow-hidden rounded-xl border border-surface-border-soft bg-surface-raised text-text-secondary shadow-2xl">
              <div className="flex items-center gap-2.5 border-b border-surface-border-soft p-3">
                <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-surface-border-soft bg-brand-glass text-sm font-black uppercase text-brand-primary shadow-sm">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    displayName.charAt(0) || "U"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-[13px] leading-5 text-text-primary">
                    {displayName}
                  </strong>
                  <span className="block truncate text-xs font-semibold text-text-muted">
                    {user.email}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-surface-border-soft px-3 py-2">
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-extrabold text-text-secondary">
                  {roleName}
                </span>
                <span className="rounded-full bg-brand-glass px-2 py-0.5 text-[11px] font-extrabold text-brand-primary">
                  로그인됨
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  setActive("profile");
                }}
                className="flex min-h-10 w-full items-center gap-2 bg-surface-raised px-3 text-left text-[13px] font-extrabold text-text-secondary hover:bg-surface-muted hover:text-text-primary"
              >
                <UserCircle className="size-4" />
                <span>프로필</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onLogout();
                }}
                className="flex min-h-10 w-full items-center gap-2 bg-surface-raised px-3 text-left text-[13px] font-extrabold text-text-secondary hover:bg-danger-glass hover:text-[var(--destructive)]"
              >
                <LogOut className="size-4" />
                <span>로그아웃</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="flex min-w-0 flex-1">
        {active === "home" ? (
          <HomePage
            user={user}
            modules={visibleModules}
            onOpen={(id) => openView(id as ViewId)}
          />
        ) : active === "profile" ? (
          <ProfilePage
            user={user}
            onUserUpdate={onUserUpdate}
            onLogout={onLogout}
            appUpdate={appUpdate}
          />
        ) : active === "settings" ? (
          <SettingsPage user={user} appUpdate={appUpdate} />
        ) : active === "prototype" ? (
          <PrototypeModule
            onOpenPrototypeNote={(prototypeId) => {
              setPrototypeNoteTargetId(prototypeId);
              setActive("prototype-note");
            }}
          />
        ) : active === "prototype-note" ? (
          <PrototypeNoteModule
            key={
              prototypeNoteTargetId
                ? `linked-${prototypeNoteTargetId}`
                : `menu-${prototypeNoteMenuKey}`
            }
            targetPrototypeId={prototypeNoteTargetId}
            onOpenPrototype={() => {
              setPrototypeNoteTargetId(null);
              setActive("prototype");
            }}
          />
        ) : active === "design-template" ? (
          <DesignTemplateModule />
        ) : active === "design-reference" ? (
          <DesignReferenceModule />
        ) : active === "common-component" ? (
          <CommonComponentModule />
        ) : active === "tutoring" ? (
          <TutoringModule />
        ) : active === "testing" ? (
          <TestingModule />
        ) : active === "ax" ? (
          <AxPlaybookModule />
        ) : active === "devops" ? (
          <DevopsPlaybookModule />
        ) : active === "cicd" ? (
          <CicdPlaybookModule />
        ) : active === "architecture" ? (
          <MybatisPlaybookModule />
        ) : active === "apidoc" ? (
          <ApiDocModule isAdmin={user.role === "admin"} />
        ) : active === "apiexcel" ? (
          <ApiExcelModule isAdmin={user.role === "admin"} />
        ) : active === "commerce" ? (
          <CommercePlaybookModule />
        ) : active === "db" ? (
          <DbPlaybookModule />
        ) : active === "sql" ? (
          <SqlPlaybookModule />
        ) : active === "debugging-playbook" ? (
          <DebuggingHistoryModule />
        ) : active === "skill-analysys" ? (
          <TechnicalDebtModule />
        ) : active === "challenge" ? (
          <ChallengePlaybookModule />
        ) : active === "chat" ? (
          <ChatModule user={user} />
        ) : (
          <CommerceToolkitModule moduleId={active} />
        )}
      </div>

      <div className="pointer-events-none absolute right-0 top-0 z-50 flex h-12 items-center pr-2">
        <div className="pointer-events-auto">
          <WindowControls />
        </div>
      </div>
    </div>
  );
}

export default AppShell;
