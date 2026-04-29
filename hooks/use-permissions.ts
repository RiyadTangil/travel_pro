import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useMemo } from "react"

export function usePermissions(modulePrefixOverride?: string) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const modulePrefix = modulePrefixOverride || pathname || ""

  const permissions = useMemo(() => {
    const userPerms = (session?.user as any)?.permissions || []
    const hasAllPerms = userPerms.includes("perm-all")

    let canCreate = hasAllPerms
    let canEdit = hasAllPerms
    let canDelete = hasAllPerms
    let canView = hasAllPerms

    if (!hasAllPerms) {
      const prefix = `perm-${modulePrefix}`
      for (const perm of userPerms) {
        const match = perm.match(new RegExp(`^${prefix}-(create|null)-(edit|null)-(view|null)-(delete|null)$`))
        if (match) {
          if (match[1] === "create") canCreate = true
          if (match[2] === "edit") canEdit = true
          if (match[3] === "view") canView = true
          if (match[4] === "delete") canDelete = true
          break
        }
        // Fallback for old uncompacted keys
        if (perm === `${prefix}-create`) canCreate = true
        if (perm === `${prefix}-edit`) canEdit = true
        if (perm === `${prefix}-view` || perm === prefix) canView = true
        if (perm === `${prefix}-delete`) canDelete = true
      }
    }

    return {
      canCreate,
      canEdit,
      canDelete,
      canView,
      hasAllPerms,
    }
  }, [session?.user, modulePrefix])

  return permissions
}
