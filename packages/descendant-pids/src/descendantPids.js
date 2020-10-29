import pstree from 'ps-tree'

export const descendantPids = (pid) => new Promise((resolve, reject) => {
  pstree(pid, (error, descendants) => {
    if (error) descendants = [] // if get children error, just ignore it
    resolve(descendants.map(processInfo => ~~processInfo.PID))
  })
})



