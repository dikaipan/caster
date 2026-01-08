import React from "react";
// @ts-ignore - react-window types have export issues
import { FixedSizeList } from "react-window";

interface VirtualListProps<T> {
    items: T[];
    height: number;
    itemHeight: number;
    renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
    className?: string;
}

export function VirtualList<T>({ items, height, itemHeight, renderItem, className }: VirtualListProps<T>) {
    return (
        <FixedSizeList
            className={className}
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width="100%"
        >
            {({ index, style }: { index: number; style: React.CSSProperties }) => (
                <div style={style}>
                    {renderItem(items[index], index, style)}
                </div>
            )}
        </FixedSizeList>
    );
}
