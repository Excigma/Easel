export const DATABASE_ACCESS_ERROR = "We're sorry, but there was an error accessing your data from the database. Please try again later."
export const DATABASE_STORE_SUCCESSFUL = 'The corresponding record has been edited in the database successfully'

/** Success: The action was successful. */
export const strSuccess = (string: string): string => `✅ | ${string}`

/** Info: Provides additional info to the user. */
export const strInfo = (string: string): string => `ℹ️ | ${string}`

/** Warn: It is most likely that the user is not using the command as documented or additional information is required. */
export const strWarn = (string: string): string => `⚠️ | ${string}`

/** Error: Something went wrong on the backend. */
export const strError = (string: string): string => `❌ | ${string}`
