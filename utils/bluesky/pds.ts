/**
 * Utility functions for PDS (Personal Data Server) URL detection
 */

type PLCDocument = {
  '@context': string[];
  id: string;
  alsoKnownAs?: string[];
  verificationMethod?: {
    id: string;
    type: string;
    controller: string;
    publicKeyMultibase: string;
  }[];
  service?: {
    id: string;
    type: string;
    serviceEndpoint: string;
  }[];
};

/**
 * Extracts the PDS URL from a DID using the PLC directory
 * @param did - The DID to look up
 * @returns Promise resolving to the PDS URL or null if not found
 */
export async function getPdsUrlFromDid(did: string): Promise<string | null> {
  try {
    const response = await fetch(`https://plc.directory/${did}`);

    if (!response.ok) {
      console.warn(`Failed to fetch PLC document for ${did}: ${response.status}`);
      return null;
    }

    const document: PLCDocument = await response.json();

    // Look for the atproto_pds service
    const pdsService = document.service?.find((service) => service.id === '#atproto_pds');

    if (pdsService?.serviceEndpoint) {
      return pdsService.serviceEndpoint;
    }

    console.warn(`No atproto_pds service found in PLC document for ${did}`);
    return null;
  } catch (error) {
    console.error(`Error fetching PLC document for ${did}:`, error);
    return null;
  }
}

/**
 * Gets the PDS URL for a handle by first resolving the DID, then looking up the PDS
 * @param handle - The Bluesky handle (with or without @)
 * @returns Promise resolving to the PDS URL or null if not found
 */
export async function getPdsUrlFromHandle(handle: string): Promise<string | null> {
  try {
    // Clean the handle (remove @ if present)
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    // First, resolve the handle to get the DID
    const response = await fetch(`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${cleanHandle}`);

    if (!response.ok) {
      console.warn(`Failed to resolve handle ${cleanHandle}: ${response.status}`);
      return null;
    }

    const result = await response.json();
    const did = result.did;

    if (!did) {
      console.warn(`No DID found for handle ${cleanHandle}`);
      return null;
    }

    // Now get the PDS URL from the DID
    return await getPdsUrlFromDid(did);
  } catch (error) {
    console.error(`Error resolving handle ${handle}:`, error);
    return null;
  }
}
