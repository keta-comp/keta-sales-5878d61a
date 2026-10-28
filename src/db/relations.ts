import { relations } from "drizzle-orm/relations";
import { businesses, crmConfigs, crmRecords, tasks, customers, leads, orders, user as userInNeonAuth, businessMembers, activities, auditLogs, platformAdmins, aiUsageEvents, featureFlags, employees, profiles, branches, systemNotifications, payments, workSchedules, cashSessions, timeOff, expenses, services, appointments, telegramLinks, payrollRules, payrollStatements, bookingRequests, billingInvoices, businessSettings, categories, products, userRoles, inventoryMovements, leadAssignments, conversations, messages, leadEvents, orderItems, aiSettings, notificationReads, telegramUpdates, employeeServices } from "./schema";

export const crmConfigsRelations = relations(crmConfigs, ({one}) => ({
	business: one(businesses, {
		fields: [crmConfigs.businessId],
		references: [businesses.id]
	}),
}));

export const businessesRelations = relations(businesses, ({one, many}) => ({
	crmConfigs: many(crmConfigs),
	crmRecords: many(crmRecords),
	tasks: many(tasks),
	activities: many(activities),
	auditLogs: many(auditLogs),
	aiUsageEvents: many(aiUsageEvents),
	featureFlags: many(featureFlags),
	employees: many(employees),
	payments: many(payments),
	workSchedules: many(workSchedules),
	cashSessions: many(cashSessions),
	timeOffs: many(timeOff),
	expenses: many(expenses),
	services: many(services),
	appointments: many(appointments),
	telegramLinks: many(telegramLinks),
	payrollRules: many(payrollRules),
	payrollStatements: many(payrollStatements),
	branches: many(branches),
	bookingRequests: many(bookingRequests),
	customers: many(customers),
	billingInvoices: many(billingInvoices),
	businessSettings: many(businessSettings),
	products: many(products),
	categories: many(categories),
	inventoryMovements: many(inventoryMovements),
	leadAssignments: many(leadAssignments),
	leads: many(leads),
	conversations: many(conversations),
	messages: many(messages),
	leadEvents: many(leadEvents),
	orders: many(orders),
	businessMembers: many(businessMembers),
	orderItems: many(orderItems),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [businesses.ownerId],
		references: [userInNeonAuth.id]
	}),
	aiSettings: many(aiSettings),
	telegramUpdates: many(telegramUpdates),
	employeeServices: many(employeeServices),
}));

export const crmRecordsRelations = relations(crmRecords, ({one}) => ({
	business: one(businesses, {
		fields: [crmRecords.businessId],
		references: [businesses.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	business: one(businesses, {
		fields: [tasks.businessId],
		references: [businesses.id]
	}),
	customer: one(customers, {
		fields: [tasks.customerId],
		references: [customers.id]
	}),
	lead: one(leads, {
		fields: [tasks.leadId],
		references: [leads.id]
	}),
	order: one(orders, {
		fields: [tasks.orderId],
		references: [orders.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [tasks.createdBy],
		references: [userInNeonAuth.id]
	}),
	businessMember: one(businessMembers, {
		fields: [tasks.assignedMemberId],
		references: [businessMembers.id]
	}),
}));

export const customersRelations = relations(customers, ({one, many}) => ({
	tasks: many(tasks),
	activities: many(activities),
	payments: many(payments),
	appointments: many(appointments),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [customers.erasedBy],
		references: [userInNeonAuth.id]
	}),
	businessMember: one(businessMembers, {
		fields: [customers.assignedMemberId],
		references: [businessMembers.id]
	}),
	business: one(businesses, {
		fields: [customers.businessId],
		references: [businesses.id]
	}),
	leads: many(leads),
	conversations: many(conversations),
	orders: many(orders),
}));

export const leadsRelations = relations(leads, ({one, many}) => ({
	tasks: many(tasks),
	leadAssignments: many(leadAssignments),
	businessMember: one(businessMembers, {
		fields: [leads.assignedMemberId],
		references: [businessMembers.id]
	}),
	customer: one(customers, {
		fields: [leads.customerId],
		references: [customers.id]
	}),
	conversation: one(conversations, {
		fields: [leads.conversationId],
		references: [conversations.id]
	}),
	product: one(products, {
		fields: [leads.productId],
		references: [products.id]
	}),
	business: one(businesses, {
		fields: [leads.businessId],
		references: [businesses.id]
	}),
	leadEvents: many(leadEvents),
	orders: many(orders),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	tasks: many(tasks),
	payments: many(payments),
	businessMember: one(businessMembers, {
		fields: [orders.assignedMemberId],
		references: [businessMembers.id]
	}),
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
	lead: one(leads, {
		fields: [orders.leadId],
		references: [leads.id]
	}),
	conversation: one(conversations, {
		fields: [orders.conversationId],
		references: [conversations.id]
	}),
	business: one(businesses, {
		fields: [orders.businessId],
		references: [businesses.id]
	}),
	orderItems: many(orderItems),
}));

export const userInNeonAuthRelations = relations(userInNeonAuth, ({many}) => ({
	tasks: many(tasks),
	activities: many(activities),
	auditLogs: many(auditLogs),
	platformAdmins: many(platformAdmins),
	aiUsageEvents: many(aiUsageEvents),
	employees: many(employees),
	systemNotifications: many(systemNotifications),
	payments: many(payments),
	cashSessions_openedBy: many(cashSessions, {
		relationName: "cashSessions_openedBy_userInNeonAuth_id"
	}),
	cashSessions_closedBy: many(cashSessions, {
		relationName: "cashSessions_closedBy_userInNeonAuth_id"
	}),
	timeOffs: many(timeOff),
	expenses: many(expenses),
	services: many(services),
	appointments: many(appointments),
	telegramLinks: many(telegramLinks),
	payrollStatements: many(payrollStatements),
	customers: many(customers),
	billingInvoices: many(billingInvoices),
	profiles: many(profiles),
	userRoles: many(userRoles),
	businessMembers: many(businessMembers),
	businesses: many(businesses),
	notificationReads: many(notificationReads),
}));

export const businessMembersRelations = relations(businessMembers, ({one, many}) => ({
	tasks: many(tasks),
	customers: many(customers),
	leadAssignments: many(leadAssignments),
	leads: many(leads),
	conversations: many(conversations),
	messages: many(messages),
	orders: many(orders),
	branch: one(branches, {
		fields: [businessMembers.branchId],
		references: [branches.id]
	}),
	business: one(businesses, {
		fields: [businessMembers.businessId],
		references: [businesses.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [businessMembers.userId],
		references: [userInNeonAuth.id]
	}),
}));

export const activitiesRelations = relations(activities, ({one}) => ({
	business: one(businesses, {
		fields: [activities.businessId],
		references: [businesses.id]
	}),
	customer: one(customers, {
		fields: [activities.customerId],
		references: [customers.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [activities.actorUserId],
		references: [userInNeonAuth.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	userInNeonAuth: one(userInNeonAuth, {
		fields: [auditLogs.actorUserId],
		references: [userInNeonAuth.id]
	}),
	business: one(businesses, {
		fields: [auditLogs.businessId],
		references: [businesses.id]
	}),
}));

export const platformAdminsRelations = relations(platformAdmins, ({one}) => ({
	userInNeonAuth: one(userInNeonAuth, {
		fields: [platformAdmins.userId],
		references: [userInNeonAuth.id]
	}),
}));

export const aiUsageEventsRelations = relations(aiUsageEvents, ({one}) => ({
	business: one(businesses, {
		fields: [aiUsageEvents.businessId],
		references: [businesses.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [aiUsageEvents.userId],
		references: [userInNeonAuth.id]
	}),
}));

export const featureFlagsRelations = relations(featureFlags, ({one}) => ({
	business: one(businesses, {
		fields: [featureFlags.targetBusinessId],
		references: [businesses.id]
	}),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	business: one(businesses, {
		fields: [employees.businessId],
		references: [businesses.id]
	}),
	profile: one(profiles, {
		fields: [employees.userId],
		references: [profiles.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [employees.createdBy],
		references: [userInNeonAuth.id]
	}),
	branch: one(branches, {
		fields: [employees.branchId],
		references: [branches.id]
	}),
	workSchedules: many(workSchedules),
	timeOffs: many(timeOff),
	appointments: many(appointments),
	payrollRules: many(payrollRules),
	payrollStatements: many(payrollStatements),
	employeeServices: many(employeeServices),
}));

export const profilesRelations = relations(profiles, ({one, many}) => ({
	employees: many(employees),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [profiles.id],
		references: [userInNeonAuth.id]
	}),
}));

export const branchesRelations = relations(branches, ({one, many}) => ({
	employees: many(employees),
	cashSessions: many(cashSessions),
	expenses: many(expenses),
	appointments: many(appointments),
	business: one(businesses, {
		fields: [branches.businessId],
		references: [businesses.id]
	}),
	businessMembers: many(businessMembers),
}));

export const systemNotificationsRelations = relations(systemNotifications, ({one, many}) => ({
	userInNeonAuth: one(userInNeonAuth, {
		fields: [systemNotifications.createdBy],
		references: [userInNeonAuth.id]
	}),
	notificationReads: many(notificationReads),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	business: one(businesses, {
		fields: [payments.businessId],
		references: [businesses.id]
	}),
	customer: one(customers, {
		fields: [payments.customerId],
		references: [customers.id]
	}),
	order: one(orders, {
		fields: [payments.orderId],
		references: [orders.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [payments.createdBy],
		references: [userInNeonAuth.id]
	}),
}));

export const workSchedulesRelations = relations(workSchedules, ({one}) => ({
	business: one(businesses, {
		fields: [workSchedules.businessId],
		references: [businesses.id]
	}),
	employee: one(employees, {
		fields: [workSchedules.employeeId],
		references: [employees.id]
	}),
}));

export const cashSessionsRelations = relations(cashSessions, ({one}) => ({
	business: one(businesses, {
		fields: [cashSessions.businessId],
		references: [businesses.id]
	}),
	userInNeonAuth_openedBy: one(userInNeonAuth, {
		fields: [cashSessions.openedBy],
		references: [userInNeonAuth.id],
		relationName: "cashSessions_openedBy_userInNeonAuth_id"
	}),
	userInNeonAuth_closedBy: one(userInNeonAuth, {
		fields: [cashSessions.closedBy],
		references: [userInNeonAuth.id],
		relationName: "cashSessions_closedBy_userInNeonAuth_id"
	}),
	branch: one(branches, {
		fields: [cashSessions.branchId],
		references: [branches.id]
	}),
}));

export const timeOffRelations = relations(timeOff, ({one}) => ({
	business: one(businesses, {
		fields: [timeOff.businessId],
		references: [businesses.id]
	}),
	employee: one(employees, {
		fields: [timeOff.employeeId],
		references: [employees.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [timeOff.createdBy],
		references: [userInNeonAuth.id]
	}),
}));

export const expensesRelations = relations(expenses, ({one, many}) => ({
	business: one(businesses, {
		fields: [expenses.businessId],
		references: [businesses.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [expenses.createdBy],
		references: [userInNeonAuth.id]
	}),
	branch: one(branches, {
		fields: [expenses.branchId],
		references: [branches.id]
	}),
	payrollStatements: many(payrollStatements),
}));

export const servicesRelations = relations(services, ({one, many}) => ({
	business: one(businesses, {
		fields: [services.businessId],
		references: [businesses.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [services.createdBy],
		references: [userInNeonAuth.id]
	}),
	appointments: many(appointments),
	employeeServices: many(employeeServices),
}));

export const appointmentsRelations = relations(appointments, ({one}) => ({
	business: one(businesses, {
		fields: [appointments.businessId],
		references: [businesses.id]
	}),
	service: one(services, {
		fields: [appointments.serviceId],
		references: [services.id]
	}),
	customer: one(customers, {
		fields: [appointments.customerId],
		references: [customers.id]
	}),
	employee: one(employees, {
		fields: [appointments.employeeId],
		references: [employees.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [appointments.createdBy],
		references: [userInNeonAuth.id]
	}),
	branch: one(branches, {
		fields: [appointments.branchId],
		references: [branches.id]
	}),
}));

export const telegramLinksRelations = relations(telegramLinks, ({one}) => ({
	userInNeonAuth: one(userInNeonAuth, {
		fields: [telegramLinks.userId],
		references: [userInNeonAuth.id]
	}),
	business: one(businesses, {
		fields: [telegramLinks.businessId],
		references: [businesses.id]
	}),
}));

export const payrollRulesRelations = relations(payrollRules, ({one}) => ({
	business: one(businesses, {
		fields: [payrollRules.businessId],
		references: [businesses.id]
	}),
	employee: one(employees, {
		fields: [payrollRules.employeeId],
		references: [employees.id]
	}),
}));

export const payrollStatementsRelations = relations(payrollStatements, ({one}) => ({
	business: one(businesses, {
		fields: [payrollStatements.businessId],
		references: [businesses.id]
	}),
	employee: one(employees, {
		fields: [payrollStatements.employeeId],
		references: [employees.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [payrollStatements.approvedBy],
		references: [userInNeonAuth.id]
	}),
	expense: one(expenses, {
		fields: [payrollStatements.expenseId],
		references: [expenses.id]
	}),
}));

export const bookingRequestsRelations = relations(bookingRequests, ({one}) => ({
	business: one(businesses, {
		fields: [bookingRequests.businessId],
		references: [businesses.id]
	}),
}));

export const billingInvoicesRelations = relations(billingInvoices, ({one}) => ({
	business: one(businesses, {
		fields: [billingInvoices.businessId],
		references: [businesses.id]
	}),
	userInNeonAuth: one(userInNeonAuth, {
		fields: [billingInvoices.createdBy],
		references: [userInNeonAuth.id]
	}),
}));

export const businessSettingsRelations = relations(businessSettings, ({one}) => ({
	business: one(businesses, {
		fields: [businessSettings.businessId],
		references: [businesses.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
	business: one(businesses, {
		fields: [products.businessId],
		references: [businesses.id]
	}),
	inventoryMovements: many(inventoryMovements),
	leads: many(leads),
	orderItems: many(orderItems),
}));

export const categoriesRelations = relations(categories, ({one, many}) => ({
	products: many(products),
	business: one(businesses, {
		fields: [categories.businessId],
		references: [businesses.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	userInNeonAuth: one(userInNeonAuth, {
		fields: [userRoles.userId],
		references: [userInNeonAuth.id]
	}),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({one}) => ({
	product: one(products, {
		fields: [inventoryMovements.productId],
		references: [products.id]
	}),
	business: one(businesses, {
		fields: [inventoryMovements.businessId],
		references: [businesses.id]
	}),
}));

export const leadAssignmentsRelations = relations(leadAssignments, ({one}) => ({
	businessMember: one(businessMembers, {
		fields: [leadAssignments.memberId],
		references: [businessMembers.id]
	}),
	lead: one(leads, {
		fields: [leadAssignments.leadId],
		references: [leads.id]
	}),
	business: one(businesses, {
		fields: [leadAssignments.businessId],
		references: [businesses.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	leads: many(leads),
	businessMember: one(businessMembers, {
		fields: [conversations.assignedMemberId],
		references: [businessMembers.id]
	}),
	customer: one(customers, {
		fields: [conversations.customerId],
		references: [customers.id]
	}),
	business: one(businesses, {
		fields: [conversations.businessId],
		references: [businesses.id]
	}),
	messages: many(messages),
	orders: many(orders),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	businessMember: one(businessMembers, {
		fields: [messages.memberId],
		references: [businessMembers.id]
	}),
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	business: one(businesses, {
		fields: [messages.businessId],
		references: [businesses.id]
	}),
}));

export const leadEventsRelations = relations(leadEvents, ({one}) => ({
	lead: one(leads, {
		fields: [leadEvents.leadId],
		references: [leads.id]
	}),
	business: one(businesses, {
		fields: [leadEvents.businessId],
		references: [businesses.id]
	}),
}));

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
	business: one(businesses, {
		fields: [orderItems.businessId],
		references: [businesses.id]
	}),
}));

export const aiSettingsRelations = relations(aiSettings, ({one}) => ({
	business: one(businesses, {
		fields: [aiSettings.businessId],
		references: [businesses.id]
	}),
}));

export const notificationReadsRelations = relations(notificationReads, ({one}) => ({
	userInNeonAuth: one(userInNeonAuth, {
		fields: [notificationReads.userId],
		references: [userInNeonAuth.id]
	}),
	systemNotification: one(systemNotifications, {
		fields: [notificationReads.notificationId],
		references: [systemNotifications.id]
	}),
}));

export const telegramUpdatesRelations = relations(telegramUpdates, ({one}) => ({
	business: one(businesses, {
		fields: [telegramUpdates.businessId],
		references: [businesses.id]
	}),
}));

export const employeeServicesRelations = relations(employeeServices, ({one}) => ({
	employee: one(employees, {
		fields: [employeeServices.employeeId],
		references: [employees.id]
	}),
	service: one(services, {
		fields: [employeeServices.serviceId],
		references: [services.id]
	}),
	business: one(businesses, {
		fields: [employeeServices.businessId],
		references: [businesses.id]
	}),
}));