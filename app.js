const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const format = require('date-fns/format')
const isMatch = require('date-fns/isMatch')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'todoApplication.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at 3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasPriorityAndStatusProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasSearchProperty = requestQuery => {
  return requestQuery.search_q !== undefined
}

const hasCategoryAndStatusProperties = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryProperty = requestQuery => {
  return requestQuery.category !== undefined
}

const hasCategoryAndPriorityProperties = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  )
}

const todos = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    category: dbObject.category,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  }
}

const validPriorities = ['HIGH', 'MEDIUM', 'LOW']
const validStatuses = ['TO DO', 'IN PROGRESS', 'DONE']
const validCategories = ['WORK', 'HOME', 'LEARNING']

//Get todos whose status is 'TO DO'
app.get('/todos/', async (request, response) => {
  let getTodosQuery = ''
  const {search_q = '', priority, status, category} = request.query

  switch (true) {
    case hasStatusProperty(request.query):
      if (!validStatuses.includes(status)) {
        return response.status(400).send('Invalid Todo Status')
      }
      getTodosQuery = `
      SELECT
      *
      FROM
      todo 
      WHERE
      todo LIKE '%${search_q}%'
      AND status = '${status}';`
      break

    case hasPriorityProperty(request.query):
      if (!validPriorities.includes(priority)) {
        return response.status(400).send('Invalid Todo Priority')
      }
      getTodosQuery = `
      SELECT
      *
      FROM
      todo 
      WHERE
      todo LIKE '%${search_q}%'
      AND priority = '${priority}';`
      break

    case hasPriorityAndStatusProperties(request.query):
      console.log('Priority:', priority)
      console.log('Status:', status)
      if (!validPriorities.includes(priority)) {
        console.log('Invalid Todo Priority')
        return response.status(400).send('Invalid Todo Priority')
      }
      if (!validStatuses.includes(status)) {
        console.log('Invalid Todo Status')
        return response.status(400).send('Invalid Todo Status')
      }
      getTodosQuery = `
      SELECT
      *
      FROM
      todo 
      WHERE
      todo LIKE '%${search_q}%'
      AND status = '${status}'
      AND priority = '${priority}';`
      break

    case hasSearchProperty(request.query):
      getTodosQuery = `
      SELECT
      *
      FROM
      todo 
      WHERE
      todo LIKE '%${search_q}%';`
      break

    case hasCategoryAndStatusProperties(request.query):
      if (!validCategories.includes(category)) {
        return response.status(400).send('Invalid Todo Category')
      }
      if (!validStatuses.includes(status)) {
        return response.status(400).send('Invalid Todo Status')
      }
      getTodosQuery = `
      SELECT
      *
      FROM
      todo 
      WHERE
      todo LIKE '%${search_q}%'
      AND category = '${category}'
      AND status = '${status}';`
      break

    case hasCategoryProperty(request.query):
      if (!validCategories.includes(category)) {
        return response.status(400).send('Invalid Todo Category')
      }
      getTodosQuery = `
      SELECT
      *
      FROM
      todo 
      WHERE
      todo LIKE '%${search_q}%'
      AND category = '${category}';`
      break

    case hasCategoryAndPriorityProperties(request.query):
      if (!validCategories.includes(category)) {
        return response.status(400).send('Invalid Todo Category')
      }
      if (!validPriorities.includes(priority)) {
        return response.status(400).send('Invalid Todo Priority')
      }
      getTodosQuery = `
      SELECT
      *
      FROM
      todo 
      WHERE
      todo LIKE '%${search_q}%'
      AND category = '${category}'
      AND priority = '${priority}';`
      break

    default:
      getTodosQuery = `
      SELECT 
      * 
      FROM 
      todo`
  }
  const data = await db.all(getTodosQuery)
  response.send(data.map(eachItem => todos(eachItem)))
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const getTodoByIdQuery = `
  SELECT * 
  FROM todo 
  WHERE 
  id = ${todoId}`

  const data = await db.get(getTodoByIdQuery)
  response.send(todos(data))
})

app.get('/agenda/', async (request, response) => {
  const {date} = request.query

  if (isMatch(date, 'yyyy-MM-dd')) {
    const newDate = format(new Date(date), 'yyyy-MM-dd')
    const dateQuery = `
    SELECT 
    * 
    FROM 
    todo 
    WHERE 
    due_date = '${newDate}'`
    const dateResponse = await db.all(dateQuery)
    response.send(dateResponse.map(eachItem => todos(eachItem)))
  } else {
    response.status(400)
    response.send('Invalid Due Date')
  }
})

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  if (validPriorities.includes(priority)) {
    if (validStatuses.includes(status)) {
      if (validCategories.includes(category)) {
        if (isMatch(dueDate, 'yyyy-MM-dd')) {
          const postDate = format(new Date(dueDate), 'yyyy-MM-dd')
          const postTodoQuery = `
          INSERT INTO 
          todo (id, todo, priority, status, category, due_date) 
          VALUES (${id}, '${todo}', '${priority}', '${status}', '${category}', '${postDate}')`

          await db.run(postTodoQuery)
          response.send('Todo Successfully Added')
        } else {
          response.status(400)
          response.send('Invalid Due Date')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
    }
  } else {
    response.status(400)
    response.send('Invalid Todo Priority')
  }
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const requestBody = request.body

  const previousTodoQuery = `SELECT * FROM todo WHERE id = ${todoId};`
  const previousTodo = await db.get(previousTodoQuery)
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body

  let updateTodoQuery = ''

  switch (true) {
    case requestBody.status !== undefined:
      if (validStatuses.includes(status)) {
        updateTodoQuery = `
        UPDATE todo 
        SET 
        status = '${status}'`

        await db.run(updateTodoQuery)
        response.send('Status Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break

    case requestBody.priority !== undefined:
      if (validPriorities.includes(priority)) {
        updateTodoQuery = `
        UPDATE todo 
        SET 
        priority = '${priority}'`

        await db.run(updateTodoQuery)
        response.send('Priority Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break

    case requestBody.todo !== undefined:
      updateTodoQuery = `
        UPDATE todo 
        SET 
        todo = '${todo}'`

      await db.run(updateTodoQuery)
      response.send('Todo Updated')
      break

    case requestBody.category !== undefined:
      if (validCategories.includes(category)) {
        updateTodoQuery = `
        UPDATE todo 
        SET 
        category = '${category}'`

        await db.run(updateTodoQuery)
        response.send('Category Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break

    case requestBody.dueDate !== undefined:
      if (isMatch(dueDate, 'yyyy-MM-dd')) {
        const newDueDate = format(new Date(dueDate), 'yyyy-MM-dd')
        updateTodoQuery = `
        UPDATE todo 
        SET 
        due_date = '${newDueDate}'`

        await db.run(updateTodoQuery)
        response.send('Due Date Updated')
      } else {
        response.status(400)
        response.send('Invalid Due Date')
      }
      break
  }
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteQuery = `
  DELETE 
  FROM 
  todo 
  WHERE 
  id = ${todoId}`
  await db.run(deleteQuery)
  response.send('Todo Deleted')
})
module.exports = app
