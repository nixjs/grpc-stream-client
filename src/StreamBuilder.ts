import * as grpcWeb from 'grpc-web'
import * as pbjs from 'google-protobuf/google/protobuf/empty_pb'
import { Types } from '@nixjs23n6/types'
import { BaseBackOff } from '@nixjs23n6/backoff-typescript'
import { Options, RetryEventDetails } from './types'
import { Stream } from './Stream'
import { StreamEvents } from './enums'

export class StreamBuilder {
    private readonly client: any
    private stream: Stream | null = null
    private method: string
    private request: Types.Object<any> | pbjs.Empty
    private metadata?: grpcWeb.Metadata
    private options?: Options
    private backoff?: BaseBackOff
    private onMetadataListeners: {
        listener: (instance: Stream, data: grpcWeb.Metadata) => any
        options?: boolean | EventListenerOptions
    }[] = []
    private onDataListeners: {
        listener: (instance: Stream, data: any) => any
        options?: boolean | EventListenerOptions
    }[] = []
    private onEndListeners: {
        listener: (instance: Stream) => any
        options?: boolean | EventListenerOptions
    }[] = []
    private onErrorListeners: {
        listener: (instance: Stream, error: grpcWeb.RpcError) => any
        options?: boolean | EventListenerOptions
    }[] = []
    private onRetryListeners: {
        listener: (instance: Stream, ev: CustomEvent<RetryEventDetails>) => any
        options?: boolean | EventListenerOptions
    }[] = []

    constructor(client: any, method: string) {
        this.client = client
        this.method = method
        this.request = new pbjs.Empty()
    }

    public withMethod(m: string): StreamBuilder {
        this.method = m
        return this
    }

    public withRequest(r: Types.Object<any> | pbjs.Empty): StreamBuilder {
        this.request = r
        return this
    }

    public withMetadata(m: grpcWeb.Metadata): StreamBuilder {
        this.metadata = m
        return this
    }

    public withBackoff(backoff: BaseBackOff): StreamBuilder {
        this.backoff = backoff
        return this
    }

    public withOption(o: Options): StreamBuilder {
        this.options = o
        return this
    }

    public onMetadata(
        listener: (instance: Stream, data: grpcWeb.Metadata) => any,
        options?: boolean | EventListenerOptions
    ): StreamBuilder {
        this.onMetadataListeners.push({ listener, options })
        return this
    }

    public onData(listener: (instance: Stream, data: any) => any, options?: boolean | EventListenerOptions): StreamBuilder {
        this.onDataListeners.push({ listener, options })
        return this
    }

    public onEnd(listener: (instance: Stream) => any, options?: boolean | EventListenerOptions): StreamBuilder {
        this.onEndListeners.push({ listener, options })
        return this
    }

    public onError(listener: (instance: Stream, error: grpcWeb.RpcError) => any, options?: boolean | EventListenerOptions): StreamBuilder {
        this.onErrorListeners.push({ listener, options })
        return this
    }

    public onRetry(
        listener: (instance: Stream, ev: CustomEvent<RetryEventDetails>) => any,
        options?: boolean | EventListenerOptions
    ): StreamBuilder {
        this.onRetryListeners.push({ listener, options })
        return this
    }

    /**
     * Multiple calls to build() will always return the same stream-instance.
     */
    public build(): Stream {
        if (this.stream !== null) return this.stream
        this.stream = new Stream(this.client, this.method, this.request, this.metadata, this.backoff, this.options)
        this.onMetadataListeners.forEach((h) => this.stream?.addEventListener(StreamEvents.metadata, h.listener, h.options))
        this.onDataListeners.forEach((h) => this.stream?.addEventListener(StreamEvents.data, h.listener, h.options))
        this.onEndListeners.forEach((h) => this.stream?.addEventListener(StreamEvents.end, h.listener, h.options))
        this.onErrorListeners.forEach((h) => this.stream?.addEventListener(StreamEvents.error, h.listener, h.options))
        this.onRetryListeners.forEach((h) => this.stream?.addEventListener(StreamEvents.retry, h.listener, h.options))
        return this.stream
    }
}
