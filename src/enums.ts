export enum StreamEvents {
    data = 'data', // A data was received
    metadata = 'metadata', // A metadata of the connection
    error = 'error', // An error occurred
    end = 'end', // Connection is ended
    retry = 'retry', // A try to re-connect is made
}
