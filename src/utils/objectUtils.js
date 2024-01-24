export function cloneRecursively(originalItem) {
    let clonedItem = {...originalItem};
    clonedItem.children = (clonedItem.children || []).map(cloneRevursively);
    return clonedItem;
}