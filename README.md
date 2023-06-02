# gRpc streaming client typescript

A client-gRPC streaming written in TypeScript for browser applications. The focus is on simplicity, reliability, and extensibility. It provides convenient features to automatically reconnect and convert data to object.

## Features

- Dependency-free and small in size
- When the connection is lost, it can optionally be configured to
  - Automatically try to reconnect in a smart way
- Easy to override metadata and request
- Support uses the `backoff` factor to apply between attempts.
- Builder-class for easy initialization and configuration
- High test-coverage and in-code documentation
  - Enables you to easily modify and extend the code

## Installation

In your project-root:

🚀 Install with npm

```
npm install @nixjs23n6/grpc-stream-client
```

🚀 Install with yarn

```
yarn add @nixjs23n6/grpc-stream-client
```

In your project-code:

```typescript
import { StreamBuilder } from '@nixjs23n6/grpc-stream-client';
```

## Usage

*Example proto:*

```typescript
export class ChatClient {
  constructor (hostname: string,
               credentials?: null | { [index: string]: string; },
               options?: null | { [index: string]: any; });

  room(
    request: JoinRoomRequest,
    metadata?: grpcWeb.Metadata
  ): grpcWeb.ClientReadableStream<RoomEvent>;
}
```

#### Initialization

Create a new instance with the provided `StreamBuilder`:

```typescript
const client = new ChatClient("host_name_url")
const stream = new StreamBuilder(client, 'room').build();
```

#### Request

Add a request into builder:

```typescript
const client = new ChatClient("host_name_url")
const stream = new StreamBuilder(client, 'room').withRequest(new google_protobuf_empty_pb.Empty()).build();
```

#### Metadata

Add a metada into buider:

```typescript
const client = new ChatClient("host_name_url")
let deadline = new Date()
deadline.setSeconds(deadline.getSeconds() + BaseTimeoutStreamingRequest).toString()
const authorization = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const stream = new StreamBuilder(client, 'room').withMetadata({ deadline, authorization }).build();
```

#### Events & Callbacks

There are five events which can be subscribed to through callbacks:

```typescript
export enum StreamEvents {
    data = 'data', // A data was received
    metadata = 'metadata', // A metadata of the connection
    error = 'error', // An error occurred
    end = 'end', // Connection is ended
    retry = 'retry', // A try to re-connect is made
}
```

The callbacks are called with the issuing streaming-instance and the causing event as arguments:

```typescript
const client = new ChatClient("host_name_url")
const stream = new StreamBuilder(client, 'room')
    .onData((i, data) => console.log('[Stream] data', data)))
    .onEnd((i) => console.log('[Stream] Ended'))
    .onError((i, error) => console.log('[Stream] Error', error))
    .onRetry((i, e) => console.log('[Stream] Retry', e))
    .build();
```

You can remove event-listener with `removeEventListener`:

```typescript
let stream: Stream
/* ... */
stream.removeEventListener(StreamEvents.data, dataEventListener);
```

#### Retry advanced

You can update `metadata` or `request` when using `onRetry` method

```typescript
const client = new ChatClient("host_name_url")
const stream = new StreamBuilder(client, 'room')
    .onRetry(async (instance) => {
        const token = await requestNewAccessToken()
            instance.metaData = {
               authorization: token
                deadline
            }
        })
    .build();
```

#### Reconnect & Backoff

If you want the gRpc streaming to automatically try to re-connect when the connection is lost, you can provide it with a `Backoff`.
The streaming will use the `Backoff` to determine how long it should wait between re-tries. There are currently three
`Backoff`-implementations. You can also implement your own by inheriting from the `Backoff`-interface.

> To use the Backoff feature, install package:

```typescript
yarn add @nixjs23n6/backoff-typescript
// Or 
npm install @nixjs23n6/backoff-typescript
```

##### ConstantBackOff

The `ConstantBackOff` will make the streaming wait a constant time between each connection retry. To use the `ConstantBackOff`
with a wait-time of `1 second`:

```typescript
const client = new ChatClient("host_name_url")
const stream = new StreamBuilder(client, 'room')
    .withBackoff(new ConstantBackOff(1000)) // 1000ms = 1s
    .build();
```

##### LinearBackOff

The `LinearBackOff` linearly increases the wait-time between connection-retries until an optional maximum is reached.
To use the `LinearBackOff` to initially wait `0 seconds` and increase the wait-time by `1 second` with every retry until
a maximum of `8 seconds` is reached:

```typescript
const client = new ChatClient("host_name_url")
const stream = new StreamBuilder(client, 'room')
    .withBackoff(new LinearBackOff(0, 1000, 8000))
    .build();
```

##### ExponentialBackOff

The `ExponentialBackOff` doubles the backoff with every retry until a maximum is reached. This is modelled after the binary
exponential-backoff algorithm used in computer-networking. To use the `ExponentialBackOff` that will produce the series
`[100, 200, 400, 800, 1600, 3200, 6400]`:

```typescript
const client = new ChatClient("host_name_url")
const stream = new StreamBuilder(client, 'room')
    .withBackoff(new ExponentialBackOff(100, 7))
    .build();
```

#### Build

To build the project run `yarn build`.
