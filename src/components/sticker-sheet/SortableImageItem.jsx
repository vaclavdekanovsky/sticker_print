import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ImageItem from './ImageItem';

export default function SortableImageItem({ id, ...props }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none', // Important for pointer events
        paddingTop: '4px', // Add some spacing for easier sorting
        paddingBottom: '4px'
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <ImageItem {...props} />
        </div>
    );
}
