/** Photos accepted per ticket. A tenant photographing one fault rarely needs more. */
export const MAX_TICKET_PHOTOS = 5;

/**
 * 8 MB per photo. Phone cameras produce 2-5 MB JPEGs, so this leaves headroom
 * for a modern handset while still bounding the request well under typical
 * reverse-proxy body limits.
 */
export const MAX_TICKET_PHOTO_BYTES = 8 * 1024 * 1024;

/** Object-key prefix for every file belonging to one ticket. */
export function ticketPhotoPrefix(ticketId: string): string {
  return `maintenance/${ticketId}`;
}
