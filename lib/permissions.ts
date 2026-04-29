export function compactPermissions(checkedKeys: string[]): string[] {
  if (checkedKeys.includes("perm-all")) return ["perm-all"]

  const routeMap = new Map<string, { c: boolean; e: boolean; v: boolean; d: boolean }>()

  checkedKeys.forEach((key) => {
    if (key === "perm-all") return

    const match = key.match(/^(perm-.*)-(create|edit|view|delete)$/)
    if (match) {
      const route = match[1]
      const action = match[2]
      if (!routeMap.has(route)) routeMap.set(route, { c: false, e: false, v: false, d: false })
      const perms = routeMap.get(route)!
      if (action === "create") perms.c = true
      if (action === "edit") perms.e = true
      if (action === "view") perms.v = true
      if (action === "delete") perms.d = true
    } else {
      // If it's a parent node or an exact match without suffix, store it just in case
      if (!routeMap.has(key)) routeMap.set(key, { c: false, e: false, v: false, d: false })
    }
  })

  const compacted: string[] = []
  for (const [route, perms] of routeMap.entries()) {
    const cStr = perms.c ? "create" : "null"
    const eStr = perms.e ? "edit" : "null"
    const vStr = perms.v ? "view" : "null"
    const dStr = perms.d ? "delete" : "null"
    
    // Only compact if it actually has at least one CRUD permission, or keep as is if it's just a parent node
    if (cStr === "null" && eStr === "null" && vStr === "null" && dStr === "null") {
      compacted.push(route)
    } else {
      compacted.push(`${route}-${cStr}-${eStr}-${vStr}-${dStr}`)
    }
  }

  return compacted
}

export function expandPermissions(compactedKeys: string[]): string[] {
  if (compactedKeys.includes("perm-all")) return ["perm-all"]

  const expanded: string[] = []
  compactedKeys.forEach((key) => {
    const match = key.match(/^(perm-.*)-(create|null)-(edit|null)-(view|null)-(delete|null)$/)
    if (match) {
      const route = match[1]
      expanded.push(route)
      if (match[2] === "create") expanded.push(`${route}-create`)
      if (match[3] === "edit") expanded.push(`${route}-edit`)
      if (match[4] === "view") expanded.push(`${route}-view`)
      if (match[5] === "delete") expanded.push(`${route}-delete`)
    } else {
      // Fallback for old data or parent nodes
      expanded.push(key)
    }
  })
  
  return expanded
}
