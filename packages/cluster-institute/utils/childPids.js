import pstree from 'ps-tree'

export const childPids = pid => new Promise(resolve => {
  pstree(pid, (error, children) => {
    // children |> delogger
    if (error) children = [] // if get children error, just ignore it
    resolve(children.map(child => ~~child.PID))
  })
})