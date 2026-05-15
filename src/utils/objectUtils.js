export function cloneRecursively(originalItem) {
    let clonedItem = { ...originalItem };
    clonedItem.children = (clonedItem.children || []).map(
        this.cloneRevursively
    );
    return clonedItem;
}
