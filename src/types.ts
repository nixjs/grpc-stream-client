import * as grpcWeb from 'grpc-web'

export interface StreamEventMap {
    metadata: grpcWeb.Metadata
    data: any
    end: unknown
    error: grpcWeb.RpcError
    retry: CustomEvent<RetryEventDetails>
}

export interface RetryEventDetails {
    readonly retries: number
    readonly backoff: number
}

export interface Options {
    retry?: boolean
    retries?: number
    isObject?: boolean
}
