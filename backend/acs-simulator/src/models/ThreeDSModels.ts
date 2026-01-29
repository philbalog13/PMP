/**
 * 3DS Models and Types
 */

export enum TransactionStatus {
    AUTHENTICATED = 'Y',           // Authentication successful
    NOT_AUTHENTICATED = 'N',       // Not authenticated
    UNABLE = 'U',                  // Unable to authenticate
    ATTEMPT = 'A',                 // Attempts processing
    CHALLENGE = 'C',               // Challenge required
    REJECTED = 'R'                 // Authentication rejected
}

export enum ECI {
    FULLY_AUTHENTICATED = '05',    // 3DS successful
    ATTEMPTED = '06',              // 3DS attempted
    NOT_AUTHENTICATED = '07'       // 3DS not performed
}

export interface AuthenticationRequest {
    threeDSServerTransID: string;
    acsTransID?: string;
    messageVersion: string;
    messageCategory: string;
    deviceChannel: string;
    acct

    Number: string;
    purchaseAmount: string;
    purchaseCurrency: string;
    purchaseDate: string;
    merchantName: string;
    mcc: string;
}

export interface AuthenticationResponse {
    threeDSServerTransID: string;
    acsTransID: string;
    transStatus: TransactionStatus;
    authenticationValue?: string;
    eci?: ECI;
    acsChallengeMandated?: string;
    authenticationType?: string;
}

export interface ChallengeRequest {
    acsTransID: string;
    challengeData: string;
}

export interface ChallengeResponse {
    transStatus: TransactionStatus;
    authenticationValue?: string;
}
