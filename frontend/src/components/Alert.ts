
const alertMask = document.querySelector('#alert-mask')! as HTMLDivElement
const alertBox = document.querySelector('#alert')! as HTMLDivElement
const messageE = alertBox.querySelector('#alert-message')! as HTMLDivElement
const alertConfirmBtn = alertBox.querySelector('#alert-confirm')! as HTMLButtonElement

alertConfirmBtn.onclick = () => {
    alertBox.style.display = 'none'
    alertMask.style.display = 'none'
}

export function openAlert(message: string) {
    messageE.textContent = message
    alertBox.style.display = 'block'
    alertMask.style.display = 'block'
}