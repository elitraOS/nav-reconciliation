-- CreateTable nav_snapshots
CREATE TABLE "nav_snapshots" (
    "id" TEXT NOT NULL,
    "vault_address" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "total_nav" BIGINT NOT NULL,
    "share_price" BIGINT NOT NULL,
    "total_supply" BIGINT NOT NULL,
    "total_assets" BIGINT NOT NULL,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nav_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable balance_snapshots
CREATE TABLE "balance_snapshots" (
    "id" TEXT NOT NULL,
    "nav_snapshot_id" TEXT NOT NULL,
    "vault_address" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "raw_value" BIGINT NOT NULL,
    "token_address" TEXT NOT NULL,
    "token_decimals" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable vault_registry
CREATE TABLE "vault_registry" (
    "id" TEXT NOT NULL,
    "vault_address" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "allocation_bps" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable job_records
CREATE TABLE "job_records" (
    "id" TEXT NOT NULL,
    "vault_address" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex UNIQUE on nav_snapshots (vault_address, block_number)
CREATE UNIQUE INDEX "vault_block_unique" ON "nav_snapshots"("vault_address", "block_number");

-- CreateIndex UNIQUE on vault_registry (vault_address, protocol, chain)
CREATE UNIQUE INDEX "vault_protocol_chain_unique" ON "vault_registry"("vault_address", "protocol", "chain");

-- AddForeignKey balance_snapshots -> nav_snapshots (no cascade delete)
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_nav_snapshot_id_fkey"
    FOREIGN KEY ("nav_snapshot_id") REFERENCES "nav_snapshots"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Immutability trigger function
CREATE OR REPLACE FUNCTION enforce_immutable_row()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'immutable row: updates and deletes are not allowed on table %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Immutability trigger on nav_snapshots
CREATE TRIGGER nav_snapshots_immutable
  BEFORE UPDATE OR DELETE ON "nav_snapshots"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_immutable_row();

-- Immutability trigger on balance_snapshots
CREATE TRIGGER balance_snapshots_immutable
  BEFORE UPDATE OR DELETE ON "balance_snapshots"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_immutable_row();
