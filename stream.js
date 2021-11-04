import { Observable, share } from 'rxjs'

function observableFromEvent(event) {
    return new Observable(sub => {
        event
            .on('data', (data) => {
                sub.next(data)
            })
            .on('error', (err) => {
                sub.error(err)
            })
            .on('end', () => sub.unsubscribe())

    })
    .pipe(share())
}


export { observableFromEvent }