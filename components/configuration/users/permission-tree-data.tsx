import type { DataNode } from "antd/es/tree"
import { getPermissionTreeData } from "@/lib/navigation"

export const PERMISSION_TREE_DATA: DataNode[] = getPermissionTreeData();
