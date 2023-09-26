
const alertMask = document.querySelector('#alert-mask')! as HTMLDivElement
const alertBox = document.querySelector('#alert')! as HTMLDivElement
const messageE = alertBox.querySelector('#alert-message')! as HTMLDivElement
const alertConfirmBtn = alertBox.querySelector('#alert-confirm')! as HTMLButtonElement

let queue: string[] = []

alertConfirmBtn.onclick = () => {
    alertBox.style.display = 'none'
    alertMask.style.display = 'none'
    queue = queue.slice(1)
    if (queue.length > 0) {
        messageE.textContent = queue[0]
        alertBox.style.display = 'block'
        alertMask.style.display = 'block'
    }
}

export function openAlert(message: string) {
    if (queue.length === 0) {
        messageE.textContent = message
    }
    queue.push(message)
    alertBox.style.display = 'block'
    alertMask.style.display = 'block'
}

export function closeAlert() {
    alertConfirmBtn.click()
}